'use client'
import type { Workout } from '@/lib/types'
import { WorkoutCard } from './WorkoutCard'

interface WorkoutListProps {
  workouts: Workout[]
  onAddToPlan?: (workout: Workout) => void
}

export function WorkoutList({ workouts, onAddToPlan }: WorkoutListProps) {
  if (workouts.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-500 text-sm">
        No workouts found. Try adjusting your filters or create a new workout.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {workouts.map((workout) => (
        <WorkoutCard key={workout.id ?? workout.name} workout={workout} onAddToPlan={onAddToPlan} />
      ))}
    </div>
  )
}
