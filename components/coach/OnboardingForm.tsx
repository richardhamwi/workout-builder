'use client'
import { useState } from 'react'
import type { CoachingProfile, DaySchedule, DayOfWeek } from '@/lib/types'

const ALL_DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const DEFAULT_SCHEDULE: DaySchedule[] = ALL_DAYS.map((day) => ({
  day,
  available: ['Tuesday', 'Thursday', 'Saturday'].includes(day),
  maxSessionMinutes: 60,
}))

interface OnboardingFormProps {
  onComplete: (profile: CoachingProfile) => void
}

type Step = 'days' | 'goals' | 'constraints' | 'events' | 'review'

export function OnboardingForm({ onComplete }: OnboardingFormProps) {
  const [step, setStep] = useState<Step>('days')
  const [schedule, setSchedule] = useState<DaySchedule[]>(DEFAULT_SCHEDULE)
  const [goals, setGoals] = useState<string[]>([])
  const [goalInput, setGoalInput] = useState('')
  const [constraints, setConstraints] = useState<string[]>([])
  const [constraintInput, setConstraintInput] = useState('')
  const [targetEvents, setTargetEvents] = useState<string[]>([])
  const [eventInput, setEventInput] = useState('')
  const [saving, setSaving] = useState(false)

  function toggleDay(day: DayOfWeek) {
    setSchedule((s) =>
      s.map((d) => (d.day === day ? { ...d, available: !d.available } : d))
    )
  }

  function setSessionLength(day: DayOfWeek, minutes: number) {
    setSchedule((s) =>
      s.map((d) => (d.day === day ? { ...d, maxSessionMinutes: minutes } : d))
    )
  }

  function addTag(
    value: string,
    list: string[],
    setList: (v: string[]) => void,
    setInput: (v: string) => void
  ) {
    const trimmed = value.trim()
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed])
    }
    setInput('')
  }

  function removeTag(value: string, list: string[], setList: (v: string[]) => void) {
    setList(list.filter((v) => v !== value))
  }

  async function handleComplete() {
    setSaving(true)
    const profile: CoachingProfile = {
      availableDays: schedule,
      goals,
      constraints,
      preferences: ['structured indoors'],
      targetEvents,
      updatedAt: new Date().toISOString(),
    }
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      onComplete(profile)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h2 className="text-2xl font-bold mb-2">Set up your coaching profile</h2>
      <p className="text-zinc-400 mb-8 text-sm">This takes 2 minutes and helps your AI coach tailor every workout to your life.</p>

      {/* Progress indicator */}
      <div className="flex gap-1.5 mb-8">
        {(['days', 'goals', 'constraints', 'events', 'review'] as Step[]).map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full ${s === step ? 'bg-indigo-500' : 'bg-zinc-700'}`}
          />
        ))}
      </div>

      {/* Step: days */}
      {step === 'days' && (
        <div>
          <h3 className="font-semibold mb-4">Which days can you train?</h3>
          <div className="space-y-2">
            {schedule.map((d) => (
              <div key={d.day} className="flex items-center gap-3 bg-zinc-800 rounded-lg px-4 py-3">
                <button
                  onClick={() => toggleDay(d.day)}
                  className={`w-5 h-5 rounded border-2 flex-shrink-0 transition-colors ${
                    d.available ? 'bg-indigo-600 border-indigo-600' : 'border-zinc-600'
                  }`}
                />
                <span className="flex-1 text-sm font-medium">{d.day}</span>
                {d.available && (
                  <select
                    value={d.maxSessionMinutes}
                    onChange={(e) => setSessionLength(d.day, Number(e.target.value))}
                    className="bg-zinc-700 text-sm rounded px-2 py-1 border-0 outline-none"
                  >
                    {[30, 45, 60, 75, 90, 120].map((m) => (
                      <option key={m} value={m}>{m}min</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => setStep('goals')}
            className="mt-6 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Step: goals */}
      {step === 'goals' && (
        <div>
          <h3 className="font-semibold mb-2">What are your training goals?</h3>
          <p className="text-zinc-400 text-sm mb-4">e.g. "build FTP", "lose weight", "sustain fitness for summer"</p>
          <div className="flex gap-2 mb-3">
            <input
              className="flex-1 bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none border border-zinc-700 focus:border-indigo-500"
              placeholder="Add a goal..."
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag(goalInput, goals, setGoals, setGoalInput)}
            />
            <button
              onClick={() => addTag(goalInput, goals, setGoals, setGoalInput)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-lg text-sm font-medium"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2 min-h-[2rem]">
            {goals.map((g) => (
              <span key={g} className="bg-zinc-700 text-sm px-3 py-1 rounded-full flex items-center gap-1.5">
                {g}
                <button onClick={() => removeTag(g, goals, setGoals)} className="text-zinc-400 hover:text-white">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep('days')} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2.5 rounded-lg">Back</button>
            <button onClick={() => setStep('constraints')} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg">Next</button>
          </div>
        </div>
      )}

      {/* Step: constraints */}
      {step === 'constraints' && (
        <div>
          <h3 className="font-semibold mb-2">Any constraints or preferences?</h3>
          <p className="text-zinc-400 text-sm mb-4">e.g. "time-poor parent", "low motivation for long Zone 2", "indoor only for structured sessions"</p>
          <div className="flex gap-2 mb-3">
            <input
              className="flex-1 bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none border border-zinc-700 focus:border-indigo-500"
              placeholder="Add a constraint..."
              value={constraintInput}
              onChange={(e) => setConstraintInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag(constraintInput, constraints, setConstraints, setConstraintInput)}
            />
            <button
              onClick={() => addTag(constraintInput, constraints, setConstraints, setConstraintInput)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-lg text-sm font-medium"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2 min-h-[2rem]">
            {constraints.map((c) => (
              <span key={c} className="bg-zinc-700 text-sm px-3 py-1 rounded-full flex items-center gap-1.5">
                {c}
                <button onClick={() => removeTag(c, constraints, setConstraints)} className="text-zinc-400 hover:text-white">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep('goals')} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2.5 rounded-lg">Back</button>
            <button onClick={() => setStep('events')} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg">Next</button>
          </div>
        </div>
      )}

      {/* Step: target events */}
      {step === 'events' && (
        <div>
          <h3 className="font-semibold mb-2">Any target events or races?</h3>
          <p className="text-zinc-400 text-sm mb-4">Optional. e.g. "Etape du Tour July 2026", "local crit series August"</p>
          <div className="flex gap-2 mb-3">
            <input
              className="flex-1 bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none border border-zinc-700 focus:border-indigo-500"
              placeholder="Add an event..."
              value={eventInput}
              onChange={(e) => setEventInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag(eventInput, targetEvents, setTargetEvents, setEventInput)}
            />
            <button
              onClick={() => addTag(eventInput, targetEvents, setTargetEvents, setEventInput)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-lg text-sm font-medium"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2 min-h-[2rem]">
            {targetEvents.map((e) => (
              <span key={e} className="bg-zinc-700 text-sm px-3 py-1 rounded-full flex items-center gap-1.5">
                {e}
                <button onClick={() => removeTag(e, targetEvents, setTargetEvents)} className="text-zinc-400 hover:text-white">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep('constraints')} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2.5 rounded-lg">Back</button>
            <button onClick={() => setStep('review')} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg">Review</button>
          </div>
        </div>
      )}

      {/* Step: review */}
      {step === 'review' && (
        <div>
          <h3 className="font-semibold mb-4">Review your profile</h3>
          <div className="space-y-3 text-sm mb-8">
            <div className="bg-zinc-800 rounded-lg px-4 py-3">
              <p className="text-zinc-400 mb-1">Training days</p>
              <p>{schedule.filter((d) => d.available).map((d) => `${d.day} (${d.maxSessionMinutes}min)`).join(', ') || 'None selected'}</p>
            </div>
            <div className="bg-zinc-800 rounded-lg px-4 py-3">
              <p className="text-zinc-400 mb-1">Goals</p>
              <p>{goals.join(', ') || 'None'}</p>
            </div>
            <div className="bg-zinc-800 rounded-lg px-4 py-3">
              <p className="text-zinc-400 mb-1">Constraints</p>
              <p>{constraints.join(', ') || 'None'}</p>
            </div>
            <div className="bg-zinc-800 rounded-lg px-4 py-3">
              <p className="text-zinc-400 mb-1">Target events</p>
              <p>{targetEvents.join(', ') || 'None'}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep('events')} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2.5 rounded-lg">Back</button>
            <button
              onClick={handleComplete}
              disabled={saving}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg"
            >
              {saving ? 'Saving...' : 'Start training'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
