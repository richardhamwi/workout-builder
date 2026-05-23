import { getAthleteData, getWorkouts, createWorkout, getEvents, createEvent } from '@/lib/intervals/client'
import type { Workout } from '@/lib/types'

const mockFetch = jest.fn()
global.fetch = mockFetch

beforeEach(() => {
  jest.resetAllMocks()
  process.env.INTERVALS_API_KEY = 'test-key'
  process.env.INTERVALS_ATHLETE_ID = 'i12345'
})

function mockJson(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  })
}

describe('getAthleteData', () => {
  it('combines athlete + wellness + activities into AthleteData', async () => {
    mockFetch
      .mockResolvedValueOnce(mockJson({ id: 12345, name: 'Rich', ftp: 280, weight: 72 }))
      .mockResolvedValueOnce(mockJson([{ ctl: 65, atl: 70, tsb: -5 }]))
      .mockResolvedValueOnce(mockJson([
        {
          id: 1001,
          name: 'Morning ride',
          start_date_local: '2026-05-10',
          type: 'VirtualRide',
          moving_time: 3600,
          icu_training_load: 85,
          average_heartrate: 155,
        },
      ]))

    const data = await getAthleteData()

    expect(data.name).toBe('Rich')
    expect(data.ftp).toBe(280)
    expect(data.ctl).toBe(65)
    expect(data.tsb).toBe(-5)
    expect(data.recentActivities).toHaveLength(1)
    expect(data.recentActivities[0].tss).toBe(85)
  })

  it('throws if INTERVALS_API_KEY is missing', async () => {
    delete process.env.INTERVALS_API_KEY
    await expect(getAthleteData()).rejects.toThrow('intervals.icu credentials not configured')
  })
})

describe('getWorkouts', () => {
  it('returns mapped workout list', async () => {
    mockFetch.mockResolvedValueOnce(
      mockJson([{ id: 'w1', name: '3x10 Sweet Spot', description: 'Hard', moving_time: 3600 }])
    )
    const workouts = await getWorkouts()
    expect(workouts).toHaveLength(1)
    expect(workouts[0].name).toBe('3x10 Sweet Spot')
    expect(workouts[0].sportType).toBe('bike')
  })
})

describe('createWorkout', () => {
  it('posts base64-encoded zwo and returns id', async () => {
    mockFetch.mockResolvedValueOnce(mockJson({ id: 'new-w1' }))
    const workout: Workout = {
      name: 'Test',
      description: 'desc',
      sportType: 'bike',
      durationSeconds: 1800,
      blocks: [],
      textEventsEnabled: false,
    }
    const result = await createWorkout(workout, '<workout_file/>')
    expect(result.id).toBe('new-w1')

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.sport_type).toBe('Ride')
    expect(typeof callBody.file).toBe('string')
    expect(Buffer.from(callBody.file, 'base64').toString()).toBe('<workout_file/>')
  })
})

describe('getEvents', () => {
  it('fetches events for date range', async () => {
    mockFetch.mockResolvedValueOnce(mockJson([{ id: 'e1', start_date_local: '2026-05-25', name: 'Ride', type: 'Ride' }]))
    const events = await getEvents('2026-05-20', '2026-05-27')
    expect(events).toHaveLength(1)
    expect(events[0].id).toBe('e1')
  })
})

describe('createEvent', () => {
  it('posts event and returns created event', async () => {
    mockFetch.mockResolvedValueOnce(
      mockJson({ id: 'ev2', start_date_local: '2026-05-26', name: 'Sweet Spot', type: 'Ride' })
    )
    const event = await createEvent({ start_date_local: '2026-05-26', name: 'Sweet Spot', type: 'Ride' })
    expect(event.id).toBe('ev2')
  })
})
