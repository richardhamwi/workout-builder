'use client'
import { useState, useEffect, useMemo } from 'react'
import type { Workout } from '@/lib/types'
import { FilterBar, type WorkoutType, type DurationFilter } from '@/components/library/FilterBar'
import { WorkoutList } from '@/components/library/WorkoutList'

function matchesDuration(workout: Workout, filter: DurationFilter): boolean {
  const minutes = workout.durationSeconds / 60
  switch (filter) {
    case '30': return minutes <= 35
    case '45': return minutes > 35 && minutes <= 52
    case '60': return minutes > 52 && minutes <= 75
    case '90+': return minutes > 75
    default: return true
  }
}

function matchesType(workout: Workout, type: WorkoutType): boolean {
  if (type === 'All') return true
  return workout.name.toLowerCase().includes(type.toLowerCase())
}

export default function LibraryPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [type, setType] = useState<WorkoutType>('All')
  const [duration, setDuration] = useState<DurationFilter>('All')

  useEffect(() => {
    fetch('/api/intervals/workouts')
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error ?? 'Failed to load workouts')
        if (!Array.isArray(data)) throw new Error('Unexpected response from workouts API')
        return data
      })
      .then((data) => { setWorkouts(data); setLoading(false) })
      .catch((err) => { setError(err.message); setLoading(false) })
  }, [])

  const filtered = useMemo(() => {
    return workouts
      .filter((w) => w.name.toLowerCase().includes(search.toLowerCase()))
      .filter((w) => matchesType(w, type))
      .filter((w) => matchesDuration(w, duration))
  }, [workouts, search, type, duration])

  return (
    <div className="px-4 py-6 md:px-8 max-w-5xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Workout Library</h1>
        <p className="text-zinc-400 text-sm mt-1">
          {loading ? 'Loading...' : `${workouts.length} workouts from intervals.icu`}
        </p>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        type={type}
        onTypeChange={setType}
        duration={duration}
        onDurationChange={setDuration}
      />

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-400 text-sm mb-4">
          {error}
        </div>
      )}

      {!loading && <WorkoutList workouts={filtered} />}
    </div>
  )
}
