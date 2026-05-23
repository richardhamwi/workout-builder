'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Workout } from '@/lib/types'
import { IntervalGraph } from '@/components/create/IntervalGraph'

function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60)
  return m >= 60
    ? `${Math.floor(m / 60)}h ${m % 60 > 0 ? (m % 60) + 'min' : ''}`.trim()
    : `${m} min`
}

function zoneSummary(workout: Workout): string {
  const zones: Record<string, number> = {}
  for (const block of workout.blocks) {
    const power = block.power ?? block.onPower ?? block.powerHigh ?? 0.6
    const zone =
      power < 0.56 ? 'Z1' :
      power < 0.76 ? 'Z2' :
      power < 0.88 ? 'Z3' :
      power < 1.05 ? 'SS' :
      power < 1.20 ? 'Z5' : 'Z6+'
    zones[zone] = (zones[zone] ?? 0) + 1
  }
  return Object.entries(zones).map(([z, n]) => `${n}×${z}`).join(' ')
}

interface GeneratedWorkoutCardProps {
  workout: Workout
}

export function GeneratedWorkoutCard({ workout: initialWorkout }: GeneratedWorkoutCardProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function saveToLibrary() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/intervals/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initialWorkout),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Save failed')
      }
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function openInCreate() {
    localStorage.setItem('coach:pendingWorkout', JSON.stringify(initialWorkout))
    router.push('/create')
  }

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-semibold text-sm">{initialWorkout.name}</h4>
          <p className="text-zinc-500 text-xs mt-0.5">
            {formatDuration(initialWorkout.durationSeconds)} · {zoneSummary(initialWorkout)}
          </p>
        </div>
        <span className="text-[10px] bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
          AI Generated
        </span>
      </div>

      {initialWorkout.description && (
        <p className="text-zinc-400 text-xs leading-relaxed">{initialWorkout.description}</p>
      )}

      <IntervalGraph blocks={initialWorkout.blocks} />

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={saveToLibrary}
          disabled={saving || saved}
          className="flex-1 text-xs bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 hover:text-white py-2 rounded-lg transition-colors"
        >
          {saved ? 'Saved to Library' : saving ? 'Saving...' : 'Save to Library'}
        </button>
        <button
          onClick={openInCreate}
          className="flex-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg transition-colors"
        >
          Open in Create
        </button>
      </div>
    </div>
  )
}
