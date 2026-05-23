'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface HealthStatus {
  redis: boolean
  gemini: boolean
  intervals: boolean
}

interface StepState {
  geminiKey: string
  intervalKey: string
  intervalId: string
  saving: boolean
  error: string | null
  saved: string | null
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5 ${
        ok ? 'bg-green-500' : 'bg-zinc-600'
      }`}
    />
  )
}

function CodeBlock({ children }: { children: string }) {
  return (
    <code className="block bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-xs font-mono text-zinc-300 whitespace-pre select-all">
      {children}
    </code>
  )
}

export default function SetupPage() {
  const router = useRouter()
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [checking, setChecking] = useState(true)
  const [step, setStep] = useState<StepState>({
    geminiKey: '',
    intervalKey: '',
    intervalId: '',
    saving: false,
    error: null,
    saved: null,
  })

  async function checkHealth() {
    setChecking(true)
    try {
      const res = await fetch('/api/health')
      const data = await res.json()
      setHealth(data)
    } catch {
      setHealth({ redis: false, gemini: false, intervals: false })
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    checkHealth()
  }, [])

  async function saveGemini() {
    setStep((s) => ({ ...s, saving: true, error: null, saved: null }))
    try {
      const res = await fetch('/api/credentials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geminiKey: step.geminiKey }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Save failed')
      }
      setStep((s) => ({ ...s, geminiKey: '', saved: 'gemini' }))
      await checkHealth()
    } catch (err) {
      setStep((s) => ({ ...s, error: err instanceof Error ? err.message : 'Save failed' }))
    } finally {
      setStep((s) => ({ ...s, saving: false }))
    }
  }

  async function saveIntervals() {
    setStep((s) => ({ ...s, saving: true, error: null, saved: null }))
    try {
      const res = await fetch('/api/credentials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: step.intervalKey, athleteId: step.intervalId }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Save failed')
      }
      setStep((s) => ({ ...s, intervalKey: '', saved: 'intervals' }))
      await checkHealth()
    } catch (err) {
      setStep((s) => ({ ...s, error: err instanceof Error ? err.message : 'Save failed' }))
    } finally {
      setStep((s) => ({ ...s, saving: false }))
    }
  }

  const allDone = health?.redis && health?.gemini && health?.intervals

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-start justify-center pt-12 px-4 pb-16">
      <div className="w-full max-w-xl flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-bold">Setup</h1>
          <p className="text-zinc-400 text-sm mt-2">
            {'Connect three services and you\'re done. This only takes a few minutes.'}
          </p>
        </div>

        {/* Step 1: Redis */}
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <StatusDot ok={!!health?.redis} />
            <div className="flex-1">
              <h2 className="font-semibold text-sm">1. Upstash Redis</h2>
              <p className="text-zinc-500 text-xs mt-1">
                Stores your coaching profile, credentials, and plan drafts. Must be configured as environment variables — Redis bootstraps everything else.
              </p>
            </div>
          </div>

          {!health?.redis && (
            <div className="ml-5 flex flex-col gap-3">
              <ol className="text-xs text-zinc-400 space-y-1 list-decimal list-inside">
                <li>Create a free database at <span className="text-indigo-400">upstash.com/redis</span></li>
                <li>Copy the REST URL and REST token from the dashboard</li>
                <li>Add them to your <code className="bg-zinc-800 px-1 rounded">.env.local</code> file:</li>
              </ol>
              <CodeBlock>{`UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here`}</CodeBlock>
              <ol className="text-xs text-zinc-400 list-decimal list-inside" start={4}>
                <li>Restart the dev server, then click Recheck below</li>
              </ol>
              <button
                onClick={checkHealth}
                disabled={checking}
                className="self-start bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-white px-4 py-1.5 rounded-lg text-xs font-medium"
              >
                {checking ? 'Checking…' : 'Recheck'}
              </button>
            </div>
          )}

          {health?.redis && (
            <p className="ml-5 text-green-400 text-xs">Connected</p>
          )}
        </div>

        {/* Step 2: Gemini */}
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <StatusDot ok={!!health?.gemini} />
            <div className="flex-1">
              <h2 className={`font-semibold text-sm ${!health?.redis ? 'text-zinc-600' : ''}`}>
                2. Google Gemini API Key
              </h2>
              <p className="text-zinc-500 text-xs mt-1">
                Powers AI coaching, workout generation, and training plans.
              </p>
            </div>
          </div>

          {health?.redis && !health?.gemini && (
            <div className="ml-5 flex flex-col gap-3">
              <ol className="text-xs text-zinc-400 space-y-1 list-decimal list-inside">
                <li>Go to <span className="text-indigo-400">aistudio.google.com</span> → Get API key</li>
                <li>Paste it below (stored encrypted in Redis):</li>
              </ol>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="AIza…"
                  value={step.geminiKey}
                  onChange={(e) => setStep((s) => ({ ...s, geminiKey: e.target.value }))}
                  className="flex-1 bg-zinc-800 border border-zinc-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm font-mono outline-none"
                />
                <button
                  onClick={saveGemini}
                  disabled={step.saving || !step.geminiKey}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-4 rounded-lg text-sm font-medium"
                >
                  {step.saving ? '…' : 'Save'}
                </button>
              </div>
              <p className="text-zinc-600 text-xs">
                Or set <code className="bg-zinc-800 px-1 rounded">GEMINI_API_KEY</code> in .env.local to skip this step.
              </p>
            </div>
          )}

          {!health?.redis && (
            <p className="ml-5 text-zinc-600 text-xs">Complete Step 1 first</p>
          )}
          {health?.gemini && (
            <p className="ml-5 text-green-400 text-xs">Connected</p>
          )}
        </div>

        {/* Step 3: intervals.icu */}
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <StatusDot ok={!!health?.intervals} />
            <div className="flex-1">
              <h2 className={`font-semibold text-sm ${!health?.redis ? 'text-zinc-600' : ''}`}>
                3. intervals.icu
              </h2>
              <p className="text-zinc-500 text-xs mt-1">
                Reads your training data (FTP, CTL, ATL, recent rides) and writes workouts and calendar events.
              </p>
            </div>
          </div>

          {health?.redis && !health?.intervals && (
            <div className="ml-5 flex flex-col gap-3">
              <ol className="text-xs text-zinc-400 space-y-1 list-decimal list-inside">
                <li>Log in to <span className="text-indigo-400">intervals.icu</span></li>
                <li>Go to Settings → API</li>
                <li>Copy your API key and athlete ID (visible in the URL: <code className="bg-zinc-800 px-1 rounded">/athlete/i123456</code>)</li>
              </ol>
              <div className="flex flex-col gap-2">
                <input
                  type="password"
                  placeholder="API key"
                  value={step.intervalKey}
                  onChange={(e) => setStep((s) => ({ ...s, intervalKey: e.target.value }))}
                  className="bg-zinc-800 border border-zinc-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm font-mono outline-none"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Athlete ID (e.g. i123456)"
                    value={step.intervalId}
                    onChange={(e) => setStep((s) => ({ ...s, intervalId: e.target.value }))}
                    className="flex-1 bg-zinc-800 border border-zinc-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm font-mono outline-none"
                  />
                  <button
                    onClick={saveIntervals}
                    disabled={step.saving || !step.intervalKey || !step.intervalId}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-4 rounded-lg text-sm font-medium"
                  >
                    {step.saving ? '…' : 'Save'}
                  </button>
                </div>
              </div>
              <p className="text-zinc-600 text-xs">
                Or set <code className="bg-zinc-800 px-1 rounded">INTERVALS_API_KEY</code> and <code className="bg-zinc-800 px-1 rounded">INTERVALS_ATHLETE_ID</code> in .env.local.
              </p>
            </div>
          )}

          {!health?.redis && (
            <p className="ml-5 text-zinc-600 text-xs">Complete Step 1 first</p>
          )}
          {health?.intervals && (
            <p className="ml-5 text-green-400 text-xs">Connected</p>
          )}
        </div>

        {step.error && (
          <p className="text-red-400 text-sm">{step.error}</p>
        )}

        {allDone && (
          <div className="flex flex-col gap-3 bg-zinc-900 border border-zinc-700 rounded-xl px-5 py-4">
            <p className="text-green-400 font-medium text-sm">All systems connected.</p>
            <button
              onClick={() => router.push('/coach')}
              className="self-start bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium text-sm"
            >
              Go to Coach →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
