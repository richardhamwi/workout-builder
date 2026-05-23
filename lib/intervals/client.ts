import type { AthleteData, Activity, Workout } from '@/lib/types'

const BASE_URL = 'https://intervals.icu/api/v1'

interface Creds { apiKey: string; athleteId: string }

async function getCredentials(): Promise<Creds> {
  const envKey = process.env.INTERVALS_API_KEY
  const envId = process.env.INTERVALS_ATHLETE_ID
  if (envKey && envId) return { apiKey: envKey, athleteId: envId }

  // Fall back to credentials stored in Redis via Settings
  try {
    const { getIntervalsCredentials } = await import('@/lib/redis/client')
    const stored = await getIntervalsCredentials()
    if (stored?.apiKey && stored?.athleteId) return stored
  } catch { /* Redis not configured — fall through to helpful error */ }

  throw new Error(
    'intervals.icu credentials not configured. Add your API key and Athlete ID in Settings, or set INTERVALS_API_KEY and INTERVALS_ATHLETE_ID in .env.local.'
  )
}

async function apiFetch<T>(path: string, creds: Creds, options?: RequestInit): Promise<T> {
  const auth = 'Basic ' + Buffer.from('API_KEY:' + creds.apiKey).toString('base64')
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`intervals.icu API error ${res.status}: ${body}`)
  }
  return res.json() as Promise<T>
}

interface RawAthlete {
  id: number
  name: string
  ftp: number
  weight: number
}

interface RawWellness {
  ctl: number
  atl: number
  tsb: number
}

interface RawActivity {
  id: number
  name: string
  start_date_local: string
  type: string
  moving_time: number
  icu_training_load: number
  average_heartrate?: number
}

export async function getAthleteData(): Promise<AthleteData> {
  const creds = await getCredentials()
  const { athleteId } = creds

  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
  const oldest = twoWeeksAgo.toISOString().split('T')[0]

  const [athlete, wellnessList, activitiesRaw] = await Promise.all([
    apiFetch<RawAthlete>(`/athlete/${athleteId}`, creds),
    apiFetch<RawWellness[]>(`/athlete/${athleteId}/wellness?oldest=${oldest}`, creds),
    apiFetch<RawActivity[]>(`/athlete/${athleteId}/activities?oldest=${oldest}`, creds),
  ])

  const wellness = wellnessList.length > 0 ? wellnessList[wellnessList.length - 1] : { ctl: 0, atl: 0, tsb: 0 }

  const recentActivities: Activity[] = activitiesRaw.map((a) => ({
    id: a.id,
    name: a.name,
    date: a.start_date_local,
    type: a.type,
    durationSeconds: a.moving_time,
    tss: a.icu_training_load ?? 0,
    averageHR: a.average_heartrate,
  }))

  return {
    id: athlete.id,
    name: athlete.name,
    ftp: athlete.ftp ?? 0,
    weight: athlete.weight ?? 0,
    ctl: wellness.ctl ?? 0,
    atl: wellness.atl ?? 0,
    tsb: wellness.tsb ?? 0,
    recentActivities,
  }
}

interface RawWorkout {
  id: string
  name: string
  description?: string
  sport_type?: string
  moving_time?: number
}

export async function getWorkouts(): Promise<Workout[]> {
  const creds = await getCredentials()
  const raw = await apiFetch<RawWorkout[]>(`/athlete/${creds.athleteId}/workouts`, creds)
  return raw.map((w) => ({
    id: w.id,
    name: w.name,
    description: w.description ?? '',
    sportType: 'bike' as const,
    durationSeconds: w.moving_time ?? 0,
    blocks: [],
    textEventsEnabled: false,
  }))
}

export async function createWorkout(workout: Workout, zwoXml: string): Promise<{ id: string }> {
  const creds = await getCredentials()
  const fileBase64 = Buffer.from(zwoXml).toString('base64')
  return apiFetch<{ id: string }>(`/athlete/${creds.athleteId}/workouts`, creds, {
    method: 'POST',
    body: JSON.stringify({
      name: workout.name,
      description: workout.description,
      sport_type: 'Ride',
      file: fileBase64,
    }),
  })
}

export interface CalendarEvent {
  id?: string
  start_date_local: string
  name: string
  description?: string
  workout_id?: string
  type: 'Ride' | 'Note'
}

export async function getEvents(oldest: string, newest: string): Promise<CalendarEvent[]> {
  const creds = await getCredentials()
  return apiFetch<CalendarEvent[]>(
    `/athlete/${creds.athleteId}/events?oldest=${oldest}&newest=${newest}`,
    creds
  )
}

export async function createEvent(event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
  const creds = await getCredentials()
  return apiFetch<CalendarEvent>(`/athlete/${creds.athleteId}/events`, creds, {
    method: 'POST',
    body: JSON.stringify(event),
  })
}
