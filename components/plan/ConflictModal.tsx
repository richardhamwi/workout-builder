'use client'
import type { CalendarEvent } from '@/lib/intervals/client'
import type { PlanSession } from '@/lib/types'

export type ConflictChoice = 'skip' | 'alongside'

export interface ConflictItem {
  session: PlanSession
  existingEvent: CalendarEvent
  choice: ConflictChoice
}

interface ConflictModalProps {
  conflicts: ConflictItem[]
  onChoiceChange: (sessionId: string, choice: ConflictChoice) => void
  onConfirm: () => void
  onCancel: () => void
  pushing: boolean
}

export function ConflictModal({ conflicts, onChoiceChange, onConfirm, onCancel, pushing }: ConflictModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg flex flex-col max-h-[80vh]">
        <div className="p-5 border-b border-zinc-800">
          <h3 className="font-semibold">Scheduling Conflicts</h3>
          <p className="text-zinc-400 text-sm mt-1">
            {conflicts.length} day{conflicts.length !== 1 ? 's' : ''} already have events. Choose how to handle each.
          </p>
        </div>
        <div className="overflow-y-auto flex-1 p-4 flex flex-col gap-3">
          {conflicts.map((c) => (
            <div key={c.session.id} className="bg-zinc-800 rounded-xl p-4 flex flex-col gap-3">
              <div>
                <p className="text-sm font-medium">{c.session.date}</p>
                <p className="text-xs text-zinc-400">
                  Plan: <span className="text-zinc-200">{c.session.workoutName}</span>
                </p>
                <p className="text-xs text-zinc-400">
                  Existing: <span className="text-zinc-200">{c.existingEvent.name}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onChoiceChange(c.session.id, 'skip')}
                  className={`flex-1 text-sm py-2 rounded-lg border transition-colors ${
                    c.choice === 'skip'
                      ? 'bg-zinc-600 border-zinc-500 text-white'
                      : 'border-zinc-700 text-zinc-400 hover:text-white'
                  }`}
                >
                  Skip
                </button>
                <button
                  onClick={() => onChoiceChange(c.session.id, 'alongside')}
                  className={`flex-1 text-sm py-2 rounded-lg border transition-colors ${
                    c.choice === 'alongside'
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'border-zinc-700 text-zinc-400 hover:text-white'
                  }`}
                >
                  Add alongside
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-zinc-800 flex gap-3">
          <button
            onClick={onCancel}
            disabled={pushing}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={pushing}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium"
          >
            {pushing ? 'Pushing...' : 'Push to intervals.icu'}
          </button>
        </div>
      </div>
    </div>
  )
}
