'use client'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import type { Workout } from '@/lib/types'
import { IntervalBuilder } from '@/components/create/IntervalBuilder'

function CreatePageInner() {
  const searchParams = useSearchParams()
  const workoutId = searchParams.get('workoutId')
  const [initialWorkout, setInitialWorkout] = useState<Workout | undefined>(undefined)
  const [loading, setLoading] = useState(!!workoutId)

  useEffect(() => {
    const fromCoach = localStorage.getItem('coach:pendingWorkout')
    if (fromCoach) {
      try {
        const w: Workout = JSON.parse(fromCoach)
        setInitialWorkout(w)
        localStorage.removeItem('coach:pendingWorkout')
        setLoading(false)
        return
      } catch {
        // ignore
      }
    }

    if (workoutId) {
      setLoading(false)
    }
  }, [workoutId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <div className="text-zinc-500 text-sm">Loading workout...</div>
      </div>
    )
  }

  return <IntervalBuilder initialWorkout={initialWorkout} />
}

export default function CreatePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full min-h-[50vh]"><div className="text-zinc-500 text-sm">Loading...</div></div>}>
      <CreatePageInner />
    </Suspense>
  )
}
