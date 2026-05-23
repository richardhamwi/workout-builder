'use client'
import { useState, useEffect } from 'react'
import type { CoachingProfile, DaySchedule, DayOfWeek } from '@/lib/types'

const ALL_DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

interface TagSectionProps {
  label: string
  items: string[]
  input: string
  onInputChange: (v: string) => void
  onAdd: () => void
  onRemove: (v: string) => void
  placeholder: string
}

function TagSection({ label, items, input, onInputChange, onAdd, onRemove, placeholder }: TagSectionProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-zinc-300">{label}</label>
      <div className="flex gap-2">
        <input
          className="flex-1 bg-zinc-800 border border-zinc-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm outline-none"
          placeholder={placeholder}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAdd()}
        />
        <button onClick={onAdd} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-lg text-sm">
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="bg-zinc-700 text-sm px-3 py-1 rounded-full flex items-center gap-1.5">
            {item}
            <button onClick={() => onRemove(item)} className="text-zinc-400 hover:text-white">×</button>
          </span>
        ))}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<CoachingProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // intervals.icu credentials
  const [apiKey, setApiKey] = useState('')
  const [athleteId, setAthleteId] = useState('')
  const [apiKeyMasked, setApiKeyMasked] = useState('')
  // Gemini credentials
  const [geminiKey, setGeminiKey] = useState('')
  const [geminiKeyMasked, setGeminiKeyMasked] = useState('')

  const [credsSaving, setCredsSaving] = useState(false)
  const [credsSaved, setCredsSaved] = useState(false)
  const [credsError, setCredsError] = useState<string | null>(null)

  const [schedule, setSchedule] = useState<DaySchedule[]>([])
  const [goals, setGoals] = useState<string[]>([])
  const [goalInput, setGoalInput] = useState('')
  const [constraints, setConstraints] = useState<string[]>([])
  const [constraintInput, setConstraintInput] = useState('')
  const [preferences, setPreferences] = useState<string[]>([])
  const [preferenceInput, setPreferenceInput] = useState('')
  const [targetEvents, setTargetEvents] = useState<string[]>([])
  const [eventInput, setEventInput] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/profile').then((r) => r.json()),
      fetch('/api/credentials').then((r) => r.json()),
    ])
      .then(([profileData, credsData]: [CoachingProfile | null, { hasKey: boolean; apiKeyMasked?: string; athleteId?: string; hasGeminiKey?: boolean; geminiKeyMasked?: string } | null]) => {
        if (profileData) {
          setProfile(profileData)
          setSchedule(
            ALL_DAYS.map((day) => {
              const existing = profileData.availableDays.find((d) => d.day === day)
              return existing ?? { day, available: false, maxSessionMinutes: 60 }
            })
          )
          setGoals(profileData.goals)
          setConstraints(profileData.constraints)
          setPreferences(profileData.preferences)
          setTargetEvents(profileData.targetEvents)
        }
        if (credsData?.athleteId) setAthleteId(credsData.athleteId)
        if (credsData?.apiKeyMasked) setApiKeyMasked(credsData.apiKeyMasked)
        if (credsData?.geminiKeyMasked) setGeminiKeyMasked(credsData.geminiKeyMasked)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleCredsSave() {
    setCredsSaving(true)
    setCredsError(null)
    setCredsSaved(false)
    try {
      const res = await fetch('/api/credentials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, athleteId, geminiKey }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Save failed')
      }
      setCredsSaved(true)
      if (apiKey && !apiKey.startsWith('••••')) {
        setApiKeyMasked('••••••••' + apiKey.slice(-4))
        setApiKey('')
      }
      if (geminiKey && !geminiKey.startsWith('••••')) {
        setGeminiKeyMasked('••••••••' + geminiKey.slice(-4))
        setGeminiKey('')
      }
      setTimeout(() => setCredsSaved(false), 3000)
    } catch (err) {
      setCredsError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setCredsSaving(false)
    }
  }

  function toggleDay(day: DayOfWeek) {
    setSchedule((s) => s.map((d) => (d.day === day ? { ...d, available: !d.available } : d)))
  }

  function setSessionLength(day: DayOfWeek, minutes: number) {
    setSchedule((s) => s.map((d) => (d.day === day ? { ...d, maxSessionMinutes: minutes } : d)))
  }

  function addTag(val: string, list: string[], setList: (v: string[]) => void, setInput: (v: string) => void) {
    const t = val.trim()
    if (t && !list.includes(t)) setList([...list, t])
    setInput('')
  }

  function removeTag(val: string, list: string[], setList: (v: string[]) => void) {
    setList(list.filter((v) => v !== val))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const updated: CoachingProfile = {
        availableDays: schedule,
        goals,
        constraints,
        preferences,
        targetEvents,
        updatedAt: new Date().toISOString(),
      }
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-zinc-500 text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="px-4 py-8 md:px-8 max-w-2xl mx-auto w-full flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Update your coaching profile. Changes take effect immediately.
        </p>
        {profile && (
          <p className="text-zinc-600 text-xs mt-1">
            Last updated: {new Date(profile.updatedAt).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Gemini connection */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="font-semibold text-sm">Gemini API Key</h2>
          <p className="text-zinc-500 text-xs mt-1">
            Powers AI coaching and workout generation. Get a free key at aistudio.google.com.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-400">API Key</label>
          <input
            type="password"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            placeholder={geminiKeyMasked || 'AIza…'}
            className="bg-zinc-800 border border-zinc-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm outline-none font-mono"
          />
        </div>
        {credsError && (
          <p className="text-red-400 text-xs">{credsError}</p>
        )}
        <button
          onClick={handleCredsSave}
          disabled={credsSaving || !geminiKey}
          className="self-start bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {credsSaving ? 'Saving...' : credsSaved ? 'Saved!' : 'Save'}
        </button>
      </div>

      <div className="border-t border-zinc-800" />

      {/* intervals.icu connection */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="font-semibold text-sm">intervals.icu Connection</h2>
          <p className="text-zinc-500 text-xs mt-1">
            Your API key is stored securely in Redis. Env vars override these settings if set.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-400">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={apiKeyMasked || 'Paste your API key from intervals.icu → Settings → API'}
              className="bg-zinc-800 border border-zinc-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm outline-none font-mono"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-400">Athlete ID</label>
            <input
              type="text"
              value={athleteId}
              onChange={(e) => setAthleteId(e.target.value)}
              placeholder="e.g. i123456"
              className="bg-zinc-800 border border-zinc-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm outline-none font-mono"
            />
            <p className="text-zinc-600 text-xs">Find your athlete ID in the intervals.icu URL: intervals.icu/athlete/<strong>i123456</strong></p>
          </div>
        </div>
        {credsError && (
          <p className="text-red-400 text-xs">{credsError}</p>
        )}
        <div className="flex items-center gap-4">
          <button
            onClick={handleCredsSave}
            disabled={credsSaving || (!apiKey && !athleteId)}
            className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {credsSaving ? 'Saving...' : credsSaved ? 'Saved!' : 'Save connection'}
          </button>
          {credsSaved && <p className="text-green-400 text-sm">Connection updated.</p>}
        </div>
      </div>

      <div className="border-t border-zinc-800" />

      <div className="flex flex-col gap-3">
        <h2 className="font-semibold text-sm">Training Days</h2>
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
                    <option key={m} value={m}>{m} min</option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>
      </div>

      <TagSection
        label="Goals"
        items={goals}
        input={goalInput}
        onInputChange={setGoalInput}
        onAdd={() => addTag(goalInput, goals, setGoals, setGoalInput)}
        onRemove={(v) => removeTag(v, goals, setGoals)}
        placeholder='e.g. "build FTP"'
      />

      <TagSection
        label="Constraints"
        items={constraints}
        input={constraintInput}
        onInputChange={setConstraintInput}
        onAdd={() => addTag(constraintInput, constraints, setConstraints, setConstraintInput)}
        onRemove={(v) => removeTag(v, constraints, setConstraints)}
        placeholder='e.g. "time-poor parent"'
      />

      <TagSection
        label="Training Preferences"
        items={preferences}
        input={preferenceInput}
        onInputChange={setPreferenceInput}
        onAdd={() => addTag(preferenceInput, preferences, setPreferences, setPreferenceInput)}
        onRemove={(v) => removeTag(v, preferences, setPreferences)}
        placeholder='e.g. "indoor structured sessions only"'
      />

      <TagSection
        label="Target Events"
        items={targetEvents}
        input={eventInput}
        onInputChange={setEventInput}
        onAdd={() => addTag(eventInput, targetEvents, setTargetEvents, setEventInput)}
        onRemove={(v) => removeTag(v, targetEvents, setTargetEvents)}
        placeholder='e.g. "Etape du Tour July 2026"'
      />

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors"
        >
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save changes'}
        </button>
        {saved && <p className="text-green-400 text-sm">Profile updated.</p>}
      </div>
    </div>
  )
}
