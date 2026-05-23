'use client'
import { useState, useEffect } from 'react'
import type { TrainingPlan, PlanSession, Workout } from '@/lib/types'
import type { CalendarEvent } from '@/lib/intervals/client'
import { BlockView } from '@/components/plan/BlockView'
import { WeeklyView } from '@/components/plan/WeeklyView'
import { ConflictModal, ConflictItem, ConflictChoice } from '@/components/plan/ConflictModal'

// ---- Library picker modal ----
function LibraryPickerModal({
  onPick,
  onClose,
}: {
  onPick: (workout: Workout) => void
  onClose: () => void
}) {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/intervals/workouts')
      .then((r) => r.json())
      .then((data) => { setWorkouts(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = workouts.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h3 className="font-semibold text-sm">Select a workout</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-sm">Close</button>
        </div>
        <div className="p-3 border-b border-zinc-800">
          <input
            type="search"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none"
          />
        </div>
        <div className="overflow-y-auto flex-1 p-2">
          {loading ? (
            <p className="text-zinc-500 text-sm text-center py-6">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-6">No workouts found</p>
          ) : (
            filtered.map((w) => (
              <button
                key={w.id}
                onClick={() => onPick(w)}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-zinc-800 text-sm flex items-center justify-between gap-2"
              >
                <span>{w.name}</span>
                <span className="text-zinc-500 text-xs">{Math.round(w.durationSeconds / 60)}min</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ---- AI adjustment mini-chat ----
function AdjustmentChat({
  plan,
  onPlanUpdate,
}: {
  plan: TrainingPlan
  onPlanUpdate: (updated: TrainingPlan) => void
}) {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdjust() {
    if (!input.trim() || sending) return
    setSending(true)
    setError(null)
    try {
      const systemPrompt = `You are a cycling coach. The user has a training plan and wants to adjust it.
Current plan JSON:
${JSON.stringify(plan, null, 2)}

The user will describe a change. Apply it and respond with ONLY the updated plan JSON (no markdown, no explanation).
Preserve the plan's id, name, and createdAt. Update the weeks array as requested.`

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ id: crypto.randomUUID(), role: 'user', content: input, timestamp: new Date().toISOString() }],
          systemPrompt,
        }),
      })
      if (!res.ok) throw new Error('Adjustment failed')
      const data: { content: string } = await res.json()

      const cleaned = data.content.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
      const updated: TrainingPlan = JSON.parse(cleaned)
      onPlanUpdate(updated)
      setInput('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Adjustment failed — try rephrasing')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="border-t border-zinc-800 pt-4 flex flex-col gap-2">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Adjust with AI</p>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdjust()}
          placeholder='e.g. "make week 3 a recovery week" or "add a rest day on Wednesday week 2"'
          disabled={sending}
          className="flex-1 bg-zinc-800 border border-zinc-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm outline-none disabled:opacity-50"
        />
        <button
          onClick={handleAdjust}
          disabled={sending || !input.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 rounded-lg text-sm font-medium"
        >
          {sending ? '...' : 'Apply'}
        </button>
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  )
}

// ---- Push button ----
function PushButton({ plan }: { plan: TrainingPlan }) {
  const [checking, setChecking] = useState(false)
  const [pushing, setPushing] = useState(false)
  const [conflicts, setConflicts] = useState<ConflictItem[] | null>(null)
  const [pushError, setPushError] = useState<string | null>(null)
  const [pushed, setPushed] = useState(false)

  async function handlePushClick() {
    setChecking(true)
    setPushError(null)

    try {
      const sessions = plan.weeks.flatMap((w) => w.sessions).filter((s) => s.workoutId)

      if (sessions.length === 0) {
        setPushError('No sessions with assigned workouts to push.')
        setChecking(false)
        return
      }

      const dates = sessions.map((s) => s.date).sort()
      const oldest = dates[0]
      const newest = dates[dates.length - 1]

      const eventsRes = await fetch(`/api/intervals/events?oldest=${oldest}&newest=${newest}`)
      if (!eventsRes.ok) throw new Error('Failed to fetch existing events')
      const existingEvents: CalendarEvent[] = await eventsRes.json()

      const found: ConflictItem[] = []
      for (const session of sessions) {
        const conflict = existingEvents.find((e) => e.start_date_local === session.date)
        if (conflict) {
          found.push({ session, existingEvent: conflict, choice: 'skip' })
        }
      }

      if (found.length > 0) {
        setConflicts(found)
      } else {
        await pushSessions(sessions, [])
      }
    } catch (err) {
      setPushError(err instanceof Error ? err.message : 'Check failed')
    } finally {
      setChecking(false)
    }
  }

  async function pushSessions(
    sessions: PlanSession[],
    resolvedConflicts: ConflictItem[]
  ) {
    setPushing(true)
    setPushError(null)
    try {
      const skipIds = new Set(
        resolvedConflicts.filter((c) => c.choice === 'skip').map((c) => c.session.id)
      )

      const toPush = sessions.filter((s) => !skipIds.has(s.id))

      await Promise.all(
        toPush.map((session) =>
          fetch('/api/intervals/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              start_date_local: session.date,
              name: session.workoutName ?? 'Training Session',
              workout_id: session.workoutId ?? undefined,
              type: 'Ride',
            }),
          })
        )
      )
      setPushed(true)
      setConflicts(null)
      setTimeout(() => setPushed(false), 4000)
    } catch (err) {
      setPushError(err instanceof Error ? err.message : 'Push failed')
    } finally {
      setPushing(false)
    }
  }

  function handleChoiceChange(sessionId: string, choice: ConflictChoice) {
    setConflicts((prev) =>
      prev ? prev.map((c) => (c.session.id === sessionId ? { ...c, choice } : c)) : null
    )
  }

  async function handleConflictConfirm() {
    if (!conflicts) return
    const sessions = plan.weeks.flatMap((w) => w.sessions).filter((s) => s.workoutId)
    await pushSessions(sessions, conflicts)
  }

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={handlePushClick}
          disabled={checking || pushing || pushed}
          className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {checking ? 'Checking...' : pushed ? 'Pushed!' : 'Push to intervals.icu'}
        </button>
        {pushError && <p className="text-red-400 text-xs text-right">{pushError}</p>}
      </div>

      {conflicts && (
        <ConflictModal
          conflicts={conflicts}
          onChoiceChange={handleChoiceChange}
          onConfirm={handleConflictConfirm}
          onCancel={() => setConflicts(null)}
          pushing={pushing}
        />
      )}
    </>
  )
}

// ---- Main page ----
export default function PlanPage() {
  const [plan, setPlan] = useState<TrainingPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const [swapSession, setSwapSession] = useState<PlanSession | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const fromCoach = localStorage.getItem('plan:draft')
    if (fromCoach) {
      try {
        const p: TrainingPlan = JSON.parse(fromCoach)
        setPlan(p)
        localStorage.removeItem('plan:draft')
        setLoading(false)
        fetch('/api/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p),
        }).catch(() => {})
        return
      } catch { /* ignore */ }
    }

    fetch('/api/drafts')
      .then(async (r) => {
        if (!r.ok) throw new Error(`Drafts fetch failed: ${r.status}`)
        return r.json()
      })
      .then((drafts: TrainingPlan[]) => {
        if (drafts && drafts.length > 0) {
          const sorted = [...drafts].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          setPlan(sorted[0])
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function handlePlanUpdate(updated: TrainingPlan) {
    setPlan(updated)
    fetch('/api/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {})
  }

  function handleSwapPick(workout: Workout) {
    if (!plan || !swapSession) return
    const updated: TrainingPlan = {
      ...plan,
      weeks: plan.weeks.map((week) => ({
        ...week,
        sessions: week.sessions.map((s) =>
          s.id === swapSession.id
            ? { ...s, workoutId: workout.id ?? null, workoutName: workout.name }
            : s
        ),
      })),
    }
    handlePlanUpdate(updated)
    setSwapSession(null)
  }

  const selectedWeekData = plan?.weeks.find((w) => w.weekNumber === selectedWeek) ?? null

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-zinc-500 text-sm">Loading...</div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4">
        <h2 className="font-semibold text-lg">No training plan yet</h2>
        <p className="text-zinc-400 text-sm text-center max-w-sm">
          Ask your coach to generate a multi-week plan, or visit the Coach tab.
        </p>
        <button
          onClick={() => { window.location.href = '/coach' }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm"
        >
          Go to Coach
        </button>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 md:px-8 max-w-5xl mx-auto w-full flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{plan.name}</h1>
          <p className="text-zinc-400 text-sm mt-1">{plan.description}</p>
          <p className="text-zinc-600 text-xs mt-1">
            {plan.weeks.length} weeks · starts {plan.startDate}
          </p>
        </div>
        <PushButton plan={plan} />
      </div>

      <BlockView
        weeks={plan.weeks}
        selectedWeek={selectedWeek}
        onSelectWeek={(n) => setSelectedWeek(n === selectedWeek ? null : n)}
      />

      {selectedWeekData && (
        <div className="border-t border-zinc-800 pt-6">
          <WeeklyView
            week={selectedWeekData}
            onSwapSession={setSwapSession}
          />
        </div>
      )}

      <AdjustmentChat plan={plan} onPlanUpdate={handlePlanUpdate} />

      {swapSession && (
        <LibraryPickerModal
          onPick={handleSwapPick}
          onClose={() => setSwapSession(null)}
        />
      )}
    </div>
  )
}
