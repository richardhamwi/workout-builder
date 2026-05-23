'use client'
import type { PlanSession } from '@/lib/types'

interface SessionSlotProps {
  session: PlanSession
  onSwap?: (session: PlanSession) => void
}

export function SessionSlot({ session, onSwap }: SessionSlotProps) {
  const hasWorkout = !!session.workoutId

  return (
    <div
      className={`rounded-lg border p-2.5 min-h-[64px] flex flex-col gap-1 ${
        hasWorkout
          ? 'bg-zinc-800 border-zinc-700 cursor-pointer hover:border-zinc-600'
          : 'bg-zinc-900 border-zinc-800 border-dashed'
      }`}
      onClick={() => hasWorkout && onSwap?.(session)}
    >
      <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
        {new Date(session.date + 'T00:00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
      </p>
      {hasWorkout ? (
        <>
          <p className="text-xs font-medium text-zinc-200 leading-snug line-clamp-2">{session.workoutName}</p>
          {session.notes && <p className="text-[10px] text-zinc-500 line-clamp-1">{session.notes}</p>}
        </>
      ) : (
        <p className="text-xs text-zinc-600">Rest</p>
      )}
    </div>
  )
}
