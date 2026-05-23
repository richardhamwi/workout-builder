import type { Workout, IntervalBlock } from '@/lib/types'

export function addBlock(workout: Workout, block: IntervalBlock): Workout {
  return {
    ...workout,
    blocks: [...workout.blocks, block],
    durationSeconds: workout.durationSeconds + block.duration,
  }
}

export function removeBlock(workout: Workout, id: string): Workout {
  const removed = workout.blocks.find((b) => b.id === id)
  return {
    ...workout,
    blocks: workout.blocks.filter((b) => b.id !== id),
    durationSeconds: workout.durationSeconds - (removed?.duration ?? 0),
  }
}

export function reorderBlocks(workout: Workout, fromIndex: number, toIndex: number): Workout {
  const blocks = [...workout.blocks]
  const [moved] = blocks.splice(fromIndex, 1)
  blocks.splice(toIndex, 0, moved)
  return { ...workout, blocks }
}

export function updateBlock(workout: Workout, id: string, changes: Partial<IntervalBlock>): Workout {
  const blocks = workout.blocks.map((b) => (b.id === id ? { ...b, ...changes } : b))
  const totalDuration = calculateDuration(blocks)
  return { ...workout, blocks, durationSeconds: totalDuration }
}

export function calculateDuration(blocks: IntervalBlock[]): number {
  return blocks.reduce((sum, block) => {
    if (block.type === 'IntervalsT') {
      const repeat = block.repeat ?? 1
      const on = block.onDuration ?? 0
      const off = block.offDuration ?? 0
      return sum + repeat * (on + off)
    }
    return sum + block.duration
  }, 0)
}
