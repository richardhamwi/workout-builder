import type { AthleteData, Activity, Workout } from '@/lib/types'

const BASE_URL = 'https://intervals.icu/api/v1'

function getAuthHeader(): string {
  const key = process.env.INTERVALS_API_KEY
  if (!key) throw new Error('INTERVALS_API_KEY not set')
  return 'Basic ' + Buffer.from('API_KEY:' + key).toString('base64')
}

function getAthleteId(): string {
  const id = process.env.INTERVALS_ATHLETE_ID
  if (!id) throw new Error('INTERVALS_ATHLETE_ID not set')
  return id
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: getAuthHeader(),
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
  const athleteId = getAthleteId()

  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
  const oldest = twoWeeksAgo.toISOString().split('T')[0]

  const [athlete, wellnessList, activitiesRaw] = await Promise.all([
    apiFetch<RawAthlete>(`/athlete/${athleteId}`),
    apiFetch<RawWellness[]>(`/athlete/${athleteId}/wellness?oldest=${oldest}`),
    apiFetch<RawActivity[]>(`/athlete/${athleteId}/activities?oldest=${oldest}`),
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
  const athleteId = getAthleteId()
  const raw = await apiFetch<RawWorkout[]>(`/athlete/${athleteId}/workouts`)
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
  const athleteId = getAthleteId()
  const fileBase64 = Buffer.from(zwoXml).toString('base64')
  return apiFetch<{ id: string }>(`/athlete/${athleteId}/workouts`, {
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
  const athleteId = getAthleteId()
  return apiFetch<CalendarEvent[]>(
    `/athlete/${athleteId}/events?oldest=${oldest}&newest=${newest}`
  )
}

export async function createEvent(event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
  const athleteId = getAthleteId()
  return apiFetch<CalendarEvent>(`/athlete/${athleteId}/events`, {
    method: 'POST',
    body: JSON.stringify(event),
  })
}
