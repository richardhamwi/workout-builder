'use client'
import type { PlanWeek } from '@/lib/types'

interface BlockViewProps {
  weeks: PlanWeek[]
  selectedWeek: number | null
  onSelectWeek: (weekNumber: number) => void
}

const FOCUS_COLORS: Record<string, string> = {
  base:     'bg-blue-900/40 border-blue-700/50',
  build:    'bg-yellow-900/40 border-yellow-700/50',
  overload: 'bg-orange-900/40 border-orange-700/50',
  peak:     'bg-red-900/40 border-red-700/50',
  recovery: 'bg-green-900/40 border-green-700/50',
}

function weekColor(focus: string): string {
  const lower = focus.toLowerCase()
  for (const [key, val] of Object.entries(FOCUS_COLORS)) {
    if (lower.includes(key)) return val
  }
  return 'bg-zinc-800 border-zinc-700'
}

export function BlockView({ weeks, selectedWeek, onSelectWeek }: BlockViewProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {weeks.map((week) => {
        const sessionCount = week.sessions.filter((s) => s.workoutId).length
        const isSelected = week.weekNumber === selectedWeek

        return (
          <button
            key={week.weekNumber}
            onClick={() => onSelectWeek(week.weekNumber)}
            className={`border rounded-xl p-4 text-left transition-all ${weekColor(week.focus)} ${
              isSelected ? 'ring-2 ring-indigo-500' : 'hover:ring-1 ring-zinc-600'
            }`}
          >
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Week {week.weekNumber}
            </p>
            <p className="font-medium text-sm mt-1 text-zinc-100">{week.focus}</p>
            <p className="text-xs text-zinc-500 mt-1.5">
              {sessionCount} session{sessionCount !== 1 ? 's' : ''}
            </p>
          </button>
        )
      })}
    </div>
  )
}
