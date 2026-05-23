import type { IntervalBlock, TextEvent, Workout } from '@/lib/types'

function isIntervalBlock(obj: unknown): obj is IntervalBlock {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'type' in obj &&
    'duration' in obj &&
    'textEvents' in obj
  )
}

function isWorkout(obj: unknown): obj is Workout {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    'blocks' in obj &&
    'sportType' in obj &&
    (obj as Workout).sportType === 'bike'
  )
}

describe('Type guards', () => {
  it('identifies a valid IntervalBlock', () => {
    const block: IntervalBlock = {
      id: 'b1',
      type: 'SteadyState',
      duration: 600,
      power: 0.88,
      textEvents: [],
    }
    expect(isIntervalBlock(block)).toBe(true)
  })

  it('rejects non-block objects', () => {
    expect(isIntervalBlock(null)).toBe(false)
    expect(isIntervalBlock({ id: 'x' })).toBe(false)
  })

  it('identifies a valid Workout', () => {
    const workout: Workout = {
      name: 'Test',
      description: '',
      sportType: 'bike',
      durationSeconds: 3600,
      blocks: [],
      textEventsEnabled: true,
    }
    expect(isWorkout(workout)).toBe(true)
  })

  it('validates TextEventCategory values', () => {
    const validCategories = ['physiology', 'motivation', 'technique', 'pacing', 'recovery', 'nutrition']
    const te: TextEvent = {
      id: 'te1',
      message: 'Push through',
      timeOffset: 30,
      duration: 10,
      category: 'motivation',
    }
    expect(validCategories).toContain(te.category)
  })
})
