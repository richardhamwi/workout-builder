import { addBlock, removeBlock, reorderBlocks, updateBlock, calculateDuration } from '@/lib/zwo/intervals'
import type { Workout, IntervalBlock } from '@/lib/types'

function block(id: string, duration: number, type: IntervalBlock['type'] = 'SteadyState'): IntervalBlock {
  return { id, type, duration, power: 0.88, textEvents: [] }
}

const base: Workout = {
  name: 'Test',
  description: '',
  sportType: 'bike',
  durationSeconds: 600,
  blocks: [block('a', 300), block('b', 300)],
  textEventsEnabled: true,
}

describe('addBlock', () => {
  it('appends block and updates duration', () => {
    const result = addBlock(base, block('c', 120))
    expect(result.blocks).toHaveLength(3)
    expect(result.blocks[2].id).toBe('c')
    expect(result.durationSeconds).toBe(720)
  })

  it('does not mutate original', () => {
    addBlock(base, block('c', 120))
    expect(base.blocks).toHaveLength(2)
  })
})

describe('removeBlock', () => {
  it('removes block by id and updates duration', () => {
    const result = removeBlock(base, 'a')
    expect(result.blocks).toHaveLength(1)
    expect(result.blocks[0].id).toBe('b')
    expect(result.durationSeconds).toBe(300)
  })

  it('is a no-op for non-existent id', () => {
    const result = removeBlock(base, 'z')
    expect(result.blocks).toHaveLength(2)
    expect(result.durationSeconds).toBe(600)
  })
})

describe('reorderBlocks', () => {
  it('moves block from index 0 to index 1', () => {
    const result = reorderBlocks(base, 0, 1)
    expect(result.blocks[0].id).toBe('b')
    expect(result.blocks[1].id).toBe('a')
  })

  it('does not mutate original', () => {
    reorderBlocks(base, 0, 1)
    expect(base.blocks[0].id).toBe('a')
  })
})

describe('updateBlock', () => {
  it('updates specified fields only', () => {
    const result = updateBlock(base, 'a', { power: 0.95, cadence: 90 })
    expect(result.blocks[0].power).toBe(0.95)
    expect(result.blocks[0].cadence).toBe(90)
    expect(result.blocks[0].id).toBe('a')
    expect(result.blocks[1].power).toBe(0.88)
  })

  it('recalculates total duration when duration changes', () => {
    const result = updateBlock(base, 'a', { duration: 600 })
    expect(result.durationSeconds).toBe(900)
  })
})

describe('calculateDuration', () => {
  it('sums simple block durations', () => {
    expect(calculateDuration([block('a', 300), block('b', 600)])).toBe(900)
  })

  it('calculates IntervalsT duration as repeat * (on + off)', () => {
    const itBlock: IntervalBlock = {
      id: 'i', type: 'IntervalsT', duration: 0,
      repeat: 5, onDuration: 180, offDuration: 180, textEvents: [],
    }
    expect(calculateDuration([itBlock])).toBe(1800)
  })

  it('handles mixed block types', () => {
    const itBlock: IntervalBlock = {
      id: 'i', type: 'IntervalsT', duration: 0,
      repeat: 3, onDuration: 120, offDuration: 60, textEvents: [],
    }
    expect(calculateDuration([block('a', 300), itBlock, block('b', 300)])).toBe(1140)
  })
})
