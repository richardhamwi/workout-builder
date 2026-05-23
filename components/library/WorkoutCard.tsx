'use client'
import { useRouter } from 'next/navigation'
import type { Workout } from '@/lib/types'

function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60)
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60 > 0 ? m % 60 + 'min' : ''}`.trim()
  return `${m} min`
}

function getZoneBadge(workout: Workout): { label: string; color: string } {
  const name = workout.name.toLowerCase()
  if (name.includes('sweet spot') || name.includes('sweetspot')) return { label: 'Sweet Spot', color: 'bg-yellow-600' }
  if (name.includes('vo2')) return { label: 'VO2 Max', color: 'bg-red-600' }
  if (name.includes('tempo')) return { label: 'Tempo', color: 'bg-orange-600' }
  if (name.includes('recovery') || name.includes('easy')) return { label: 'Recovery', color: 'bg-blue-700' }
  if (name.includes('endurance') || name.includes('base') || name.includes('z2')) return { label: 'Endurance', color: 'bg-green-700' }
  return { label: 'Mixed', color: 'bg-zinc-600' }
}

function MiniGraph({ workout }: { workout: Workout }) {
  if (!workout.blocks || workout.blocks.length === 0) {
    return (
      <svg viewBox="0 0 100 30" className="w-full h-8" preserveAspectRatio="none">
        <rect x="0" y="7" width="100" height="23" fill="#4f46e5" opacity="0.4" rx="1" />
      </svg>
    )
  }

  const totalDuration = workout.blocks.reduce((s, b) => s + b.duration, 0)
  let x = 0

  return (
    <svg viewBox="0 0 100 30" className="w-full h-8" preserveAspectRatio="none">
      {workout.blocks.map((block, i) => {
        const w = (block.duration / totalDuration) * 100
        const power = block.power ?? block.onPower ?? block.powerHigh ?? 0.6
        const h = Math.min(30, Math.round((power / 1.5) * 30))
        const y = 30 - h
        const fill =
          power < 0.6 ? '#60a5fa' :
          power < 0.76 ? '#34d399' :
          power < 0.88 ? '#fbbf24' :
          power < 1.05 ? '#f97316' : '#ef4444'
        const rect = (
          <rect key={i} x={x.toFixed(1)} y={y} width={Math.max(1, w - 0.5).toFixed(1)} height={h} fill={fill} rx="0.5" />
        )
        x += w
        return rect
      })}
    </svg>
  )
}

interface WorkoutCardProps {
  workout: Workout
  onAddToPlan?: (workout: Workout) => void
}

export function WorkoutCard({ workout, onAddToPlan }: WorkoutCardProps) {
  const router = useRouter()
  const badge = getZoneBadge(workout)

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 flex flex-col gap-3 hover:border-zinc-600 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-medium text-sm leading-snug">{workout.name}</h3>
          <p className="text-zinc-500 text-xs mt-0.5">{formatDuration(workout.durationSeconds)}</p>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.color} text-white flex-shrink-0`}>
          {badge.label}
        </span>
      </div>
      <MiniGraph workout={workout} />
      <div className="flex gap-2">
        <button
          onClick={() => router.push(`/create?workoutId=${workout.id}`)}
          className="flex-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 hover:text-white py-1.5 rounded-lg transition-colors"
        >
          Open in Create
        </button>
        {onAddToPlan && (
          <button
            onClick={() => onAddToPlan(workout)}
            className="flex-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white py-1.5 rounded-lg transition-colors"
          >
            Add to Plan
          </button>
        )}
      </div>
    </div>
  )
}
