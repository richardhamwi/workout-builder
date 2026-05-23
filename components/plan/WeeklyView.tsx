'use client'
import type { PlanWeek, PlanSession } from '@/lib/types'
import { SessionSlot } from './SessionSlot'

interface WeeklyViewProps {
  week: PlanWeek
  onSwapSession?: (session: PlanSession) => void
}

export function WeeklyView({ week, onSwapSession }: WeeklyViewProps) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="font-semibold text-sm">Week {week.weekNumber}</h3>
        <p className="text-zinc-400 text-xs">{week.focus}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {week.sessions.map((session) => (
          <SessionSlot
            key={session.id}
            session={session}
            onSwap={onSwapSession}
          />
        ))}
      </div>
    </div>
  )
}
