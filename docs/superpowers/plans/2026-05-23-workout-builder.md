# Workout Builder — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cycling training companion web app that sits on top of intervals.icu — AI-coached workout generation with science-rich textevents, training plan management, and automatic sync to intervals.icu.

**Architecture:** Next.js 14 (App Router) + TypeScript. All external API calls (Gemini, intervals.icu) go through Next.js API routes so keys never touch the client. Upstash Redis stores coaching profile and plan drafts. intervals.icu is the source of truth for workouts and calendar.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, @google/generative-ai, @upstash/redis, @hello-pangea/dnd, Jest + React Testing Library

---

## File Structure

```
workout-builder/
├── app/
│   ├── layout.tsx                    # Root layout with Sidebar + BottomNav
│   ├── page.tsx                      # Redirect to /coach
│   ├── coach/
│   │   └── page.tsx                  # Coach mode: chat + onboarding
│   ├── plan/
│   │   └── page.tsx                  # Plan mode: block + weekly view
│   ├── create/
│   │   └── page.tsx                  # Create mode: interval builder
│   ├── library/
│   │   └── page.tsx                  # Library mode: workout list
│   ├── settings/
│   │   └── page.tsx                  # Settings: coaching profile editor
│   └── api/
│       ├── intervals/
│       │   ├── athlete/route.ts
│       │   ├── workouts/route.ts
│       │   └── events/route.ts
│       ├── ai/
│       │   ├── chat/route.ts
│       │   ├── generate-workout/route.ts
│       │   ├── generate-plan/route.ts
│       │   └── generate-textevents/route.ts
│       └── profile/route.ts
├── components/
│   ├── nav/
│   │   ├── Sidebar.tsx
│   │   └── BottomNav.tsx
│   ├── coach/
│   │   ├── ChatInterface.tsx
│   │   ├── ChatMessage.tsx
│   │   ├── QuickStartSuggestions.tsx
│   │   ├── GeneratedWorkoutCard.tsx
│   │   └── OnboardingForm.tsx
│   ├── plan/
│   │   ├── BlockView.tsx
│   │   ├── WeeklyView.tsx
│   │   ├── SessionSlot.tsx
│   │   └── ConflictModal.tsx
│   ├── create/
│   │   ├── IntervalBuilder.tsx
│   │   ├── IntervalGraph.tsx
│   │   ├── BlockPalette.tsx
│   │   ├── BlockEditor.tsx
│   │   └── TextEventEditor.tsx
│   └── library/
│       ├── WorkoutList.tsx
│       ├── WorkoutCard.tsx
│       └── FilterBar.tsx
├── lib/
│   ├── types.ts
│   ├── intervals/
│   │   └── client.ts
│   ├── ai/
│   │   ├── client.ts
│   │   └── gemini.ts
│   ├── redis/
│   │   └── client.ts
│   └── zwo/
│       ├── generator.ts
│       └── intervals.ts
├── __tests__/
│   ├── lib/
│   │   ├── intervals/client.test.ts
│   │   ├── ai/gemini.test.ts
│   │   ├── redis/client.test.ts
│   │   └── zwo/
│   │       ├── generator.test.ts
│   │       └── intervals.test.ts
│   └── types.test.ts
├── .env.local.example
├── jest.config.ts
└── jest.setup.ts
```

---

### Task 1: Scaffold Next.js Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `jest.config.ts`, `jest.setup.ts`, `.env.local.example`

- [ ] **Step 1: Bootstrap Next.js app**
```bash
npx create-next-app@14 workout-builder \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*"
cd workout-builder
```

- [ ] **Step 2: Install runtime dependencies**
```bash
npm install @google/generative-ai @upstash/redis @hello-pangea/dnd uuid
npm install --save-dev @types/uuid
```
Expected: no peer dependency errors.

- [ ] **Step 3: Install Jest + React Testing Library**
```bash
npm install --save-dev jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event ts-jest @types/jest
```

- [ ] **Step 4: Write jest.config.ts**
```typescript
// jest.config.ts
import type { Config } from 'jest'

const config: Config = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
}

export default config
```

- [ ] **Step 5: Write jest.setup.ts**
```typescript
// jest.setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Write .env.local.example**
```
# intervals.icu credentials
INTERVALS_API_KEY=your_api_key_here
INTERVALS_ATHLETE_ID=your_athlete_id_here

# Google AI Studio — free tier: 1,500 requests/day
GEMINI_API_KEY=your_gemini_key_here

# Upstash Redis — free tier: 10,000 commands/day
UPSTASH_REDIS_REST_URL=https://your-endpoint.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

- [ ] **Step 7: Add test script to package.json**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

- [ ] **Step 8: Verify scaffold**
```bash
npm run build
# Expected: Build successful, no TypeScript errors
npm test -- --passWithNoTests
# Expected: Test suite passes (no tests yet)
```

- [ ] **Step 9: Commit**
```bash
git add package.json package-lock.json tsconfig.json tailwind.config.ts \
  jest.config.ts jest.setup.ts .env.local.example next.config.ts
git commit -m "feat: scaffold Next.js 14 project with TypeScript, Tailwind, and Jest"
```

---

### Task 2: Define Shared TypeScript Types

**Files:**
- Create: `lib/types.ts`
- Create: `__tests__/types.test.ts`

- [ ] **Step 1: Write lib/types.ts**
```typescript
// lib/types.ts

export type BlockType = 'Warmup' | 'SteadyState' | 'IntervalsT' | 'Ramp' | 'Cooldown'
export type TextEventCategory = 'physiology' | 'motivation' | 'technique' | 'pacing' | 'recovery' | 'nutrition'
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'

export interface TextEvent {
  id: string
  message: string
  timeOffset: number   // seconds from start of block
  duration: number     // seconds to display (default 10)
  category: TextEventCategory
}

export interface IntervalBlock {
  id: string
  type: BlockType
  duration: number     // total seconds
  power?: number       // fraction of FTP (SteadyState)
  powerLow?: number    // ramp start (Warmup/Cooldown/Ramp)
  powerHigh?: number   // ramp end
  cadence?: number
  repeat?: number      // IntervalsT
  onDuration?: number  // IntervalsT on-interval seconds
  offDuration?: number // IntervalsT off-interval seconds
  onPower?: number     // IntervalsT on-interval power (fraction of FTP)
  offPower?: number    // IntervalsT off-interval power (fraction of FTP)
  textEvents: TextEvent[]
}

export interface Workout {
  id?: string
  name: string
  description: string
  sportType: 'bike'
  durationSeconds: number
  blocks: IntervalBlock[]
  textEventsEnabled: boolean
}

export interface Activity {
  id: number
  name: string
  date: string
  type: string
  durationSeconds: number
  tss: number
  averageHR?: number
}

export interface AthleteData {
  id: number
  name: string
  ftp: number
  weight: number
  ctl: number
  atl: number
  tsb: number
  recentActivities: Activity[]
}

export interface DaySchedule {
  day: DayOfWeek
  available: boolean
  maxSessionMinutes: number
}

export interface CoachingProfile {
  availableDays: DaySchedule[]
  goals: string[]
  constraints: string[]
  preferences: string[]
  targetEvents: string[]
  updatedAt: string
}

export interface PlanSession {
  id: string
  date: string
  workoutId: string | null
  workoutName: string | null
  notes?: string
}

export interface PlanWeek {
  weekNumber: number
  focus: string
  sessions: PlanSession[]
}

export interface TrainingPlan {
  id: string
  name: string
  description: string
  startDate: string
  weeks: PlanWeek[]
  createdAt: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  attachedWorkout?: Workout
  attachedPlan?: TrainingPlan
}

export interface AIClient {
  chat(messages: ChatMessage[], systemPrompt: string): Promise<string>
  generateWorkout(prompt: string, athleteData: AthleteData, profile: CoachingProfile): Promise<Workout>
  generatePlan(prompt: string, athleteData: AthleteData, profile: CoachingProfile): Promise<TrainingPlan>
  generateTextEvents(workout: Workout): Promise<TextEvent[][]>
}
```

- [ ] **Step 2: Write type guard test (verifies Jest is working)**
```typescript
// __tests__/types.test.ts
import type { IntervalBlock, TextEvent, Workout, CoachingProfile } from '@/lib/types'

function isIntervalBlock(obj: unknown): obj is IntervalBlock {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'type' in obj &&
    'duration' in obj &&
    'textEvents' in obj
  )
}

function isWorkout(obj: unknown): obj is Workout {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    'blocks' in obj &&
    'sportType' in obj &&
    (obj as Workout).sportType === 'bike'
  )
}

describe('Type guards', () => {
  it('identifies a valid IntervalBlock', () => {
    const block: IntervalBlock = {
      id: 'b1',
      type: 'SteadyState',
      duration: 600,
      power: 0.88,
      textEvents: [],
    }
    expect(isIntervalBlock(block)).toBe(true)
  })

  it('rejects non-block objects', () => {
    expect(isIntervalBlock(null)).toBe(false)
    expect(isIntervalBlock({ id: 'x' })).toBe(false)
  })

  it('identifies a valid Workout', () => {
    const workout: Workout = {
      name: 'Test',
      description: '',
      sportType: 'bike',
      durationSeconds: 3600,
      blocks: [],
      textEventsEnabled: true,
    }
    expect(isWorkout(workout)).toBe(true)
  })

  it('validates TextEventCategory values', () => {
    const validCategories = ['physiology', 'motivation', 'technique', 'pacing', 'recovery', 'nutrition']
    const te: TextEvent = {
      id: 'te1',
      message: 'Push through',
      timeOffset: 30,
      duration: 10,
      category: 'motivation',
    }
    expect(validCategories).toContain(te.category)
  })
})
```

- [ ] **Step 3: Run tests**
```bash
npm test __tests__/types.test.ts
# Expected:
#   PASS  __tests__/types.test.ts
#   Type guards
#     ✓ identifies a valid IntervalBlock
#     ✓ rejects non-block objects
#     ✓ identifies a valid Workout
#     ✓ validates TextEventCategory values
#   Tests: 4 passed
```

- [ ] **Step 4: Commit**
```bash
git add lib/types.ts __tests__/types.test.ts
git commit -m "feat: add shared TypeScript types and type guard tests"
```

---

### Task 3: Build intervals.icu API Client

**Files:**
- Create: `lib/intervals/client.ts`
- Create: `__tests__/lib/intervals/client.test.ts`

- [ ] **Step 1: Write lib/intervals/client.ts**
```typescript
// lib/intervals/client.ts
import type { AthleteData, Activity, Workout } from '@/lib/types'

const BASE_URL = 'https://intervals.icu/api/v1'

function getAuthHeader(): string {
  const key = process.env.INTERVALS_API_KEY
  if (!key) throw new Error('INTERVALS_API_KEY not set')
  return 'Basic ' + Buffer.from('API_KEY:' + key).toString('base64')
}

function getAthleteId(): string {
  const id = process.env.INTERVALS_ATHLETE_ID
  if (!id) throw new Error('INTERVALS_ATHLETE_ID not set')
  return id
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`intervals.icu API error ${res.status}: ${body}`)
  }
  return res.json() as Promise<T>
}

// Shape returned by GET /athlete/{id}
interface RawAthlete {
  id: number
  name: string
  ftp: number
  weight: number
}

// Shape returned by GET /athlete/{id}/wellness
interface RawWellness {
  ctl: number
  atl: number
  tsb: number
}

// Shape returned by GET /athlete/{id}/activities
interface RawActivity {
  id: number
  name: string
  start_date_local: string
  type: string
  moving_time: number
  icu_training_load: number
  average_heartrate?: number
}

export async function getAthleteData(): Promise<AthleteData> {
  const athleteId = getAthleteId()

  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
  const oldest = twoWeeksAgo.toISOString().split('T')[0]

  const [athlete, wellnessList, activitiesRaw] = await Promise.all([
    apiFetch<RawAthlete>(`/athlete/${athleteId}`),
    apiFetch<RawWellness[]>(`/athlete/${athleteId}/wellness?oldest=${oldest}`),
    apiFetch<RawActivity[]>(`/athlete/${athleteId}/activities?oldest=${oldest}`),
  ])

  // Most recent wellness entry
  const wellness = wellnessList.length > 0 ? wellnessList[wellnessList.length - 1] : { ctl: 0, atl: 0, tsb: 0 }

  const recentActivities: Activity[] = activitiesRaw.map((a) => ({
    id: a.id,
    name: a.name,
    date: a.start_date_local,
    type: a.type,
    durationSeconds: a.moving_time,
    tss: a.icu_training_load ?? 0,
    averageHR: a.average_heartrate,
  }))

  return {
    id: athlete.id,
    name: athlete.name,
    ftp: athlete.ftp ?? 0,
    weight: athlete.weight ?? 0,
    ctl: wellness.ctl ?? 0,
    atl: wellness.atl ?? 0,
    tsb: wellness.tsb ?? 0,
    recentActivities,
  }
}

interface RawWorkout {
  id: string
  name: string
  description?: string
  sport_type?: string
  moving_time?: number
}

export async function getWorkouts(): Promise<Workout[]> {
  const athleteId = getAthleteId()
  const raw = await apiFetch<RawWorkout[]>(`/athlete/${athleteId}/workouts`)
  return raw.map((w) => ({
    id: w.id,
    name: w.name,
    description: w.description ?? '',
    sportType: 'bike' as const,
    durationSeconds: w.moving_time ?? 0,
    blocks: [],
    textEventsEnabled: false,
  }))
}

export async function createWorkout(workout: Workout, zwoXml: string): Promise<{ id: string }> {
  const athleteId = getAthleteId()
  const fileBase64 = Buffer.from(zwoXml).toString('base64')
  return apiFetch<{ id: string }>(`/athlete/${athleteId}/workouts`, {
    method: 'POST',
    body: JSON.stringify({
      name: workout.name,
      description: workout.description,
      sport_type: 'Ride',
      file: fileBase64,
    }),
  })
}

export interface CalendarEvent {
  id?: string
  start_date_local: string
  name: string
  description?: string
  workout_id?: string
  type: 'Ride' | 'Note'
}

export async function getEvents(oldest: string, newest: string): Promise<CalendarEvent[]> {
  const athleteId = getAthleteId()
  return apiFetch<CalendarEvent[]>(
    `/athlete/${athleteId}/events?oldest=${oldest}&newest=${newest}`
  )
}

export async function createEvent(event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
  const athleteId = getAthleteId()
  return apiFetch<CalendarEvent>(`/athlete/${athleteId}/events`, {
    method: 'POST',
    body: JSON.stringify(event),
  })
}
```

- [ ] **Step 2: Write __tests__/lib/intervals/client.test.ts**
```typescript
// __tests__/lib/intervals/client.test.ts
import { getAthleteData, getWorkouts, createWorkout, getEvents, createEvent } from '@/lib/intervals/client'
import type { Workout } from '@/lib/types'

const mockFetch = jest.fn()
global.fetch = mockFetch

beforeEach(() => {
  jest.resetAllMocks()
  process.env.INTERVALS_API_KEY = 'test-key'
  process.env.INTERVALS_ATHLETE_ID = 'i12345'
})

function mockJson(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  })
}

describe('getAthleteData', () => {
  it('combines athlete + wellness + activities into AthleteData', async () => {
    mockFetch
      .mockResolvedValueOnce(mockJson({ id: 12345, name: 'Rich', ftp: 280, weight: 72 }))
      .mockResolvedValueOnce(mockJson([{ ctl: 65, atl: 70, tsb: -5 }]))
      .mockResolvedValueOnce(mockJson([
        {
          id: 1001,
          name: 'Morning ride',
          start_date_local: '2026-05-10',
          type: 'VirtualRide',
          moving_time: 3600,
          icu_training_load: 85,
          average_heartrate: 155,
        },
      ]))

    const data = await getAthleteData()

    expect(data.name).toBe('Rich')
    expect(data.ftp).toBe(280)
    expect(data.ctl).toBe(65)
    expect(data.tsb).toBe(-5)
    expect(data.recentActivities).toHaveLength(1)
    expect(data.recentActivities[0].tss).toBe(85)
  })

  it('throws if INTERVALS_API_KEY is missing', async () => {
    delete process.env.INTERVALS_API_KEY
    await expect(getAthleteData()).rejects.toThrow('INTERVALS_API_KEY not set')
  })
})

describe('getWorkouts', () => {
  it('returns mapped workout list', async () => {
    mockFetch.mockResolvedValueOnce(
      mockJson([{ id: 'w1', name: '3x10 Sweet Spot', description: 'Hard', moving_time: 3600 }])
    )
    const workouts = await getWorkouts()
    expect(workouts).toHaveLength(1)
    expect(workouts[0].name).toBe('3x10 Sweet Spot')
    expect(workouts[0].sportType).toBe('bike')
  })
})

describe('createWorkout', () => {
  it('posts base64-encoded zwo and returns id', async () => {
    mockFetch.mockResolvedValueOnce(mockJson({ id: 'new-w1' }))
    const workout: Workout = {
      name: 'Test',
      description: 'desc',
      sportType: 'bike',
      durationSeconds: 1800,
      blocks: [],
      textEventsEnabled: false,
    }
    const result = await createWorkout(workout, '<workout_file/>')
    expect(result.id).toBe('new-w1')

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.sport_type).toBe('Ride')
    // file should be base64
    expect(typeof callBody.file).toBe('string')
    expect(Buffer.from(callBody.file, 'base64').toString()).toBe('<workout_file/>')
  })
})

describe('getEvents', () => {
  it('fetches events for date range', async () => {
    mockFetch.mockResolvedValueOnce(mockJson([{ id: 'e1', start_date_local: '2026-05-25', name: 'Ride' }]))
    const events = await getEvents('2026-05-20', '2026-05-27')
    expect(events).toHaveLength(1)
    expect(events[0].id).toBe('e1')
  })
})

describe('createEvent', () => {
  it('posts event and returns created event', async () => {
    mockFetch.mockResolvedValueOnce(
      mockJson({ id: 'ev2', start_date_local: '2026-05-26', name: 'Sweet Spot', type: 'Ride' })
    )
    const event = await createEvent({ start_date_local: '2026-05-26', name: 'Sweet Spot', type: 'Ride' })
    expect(event.id).toBe('ev2')
  })
})
```

- [ ] **Step 3: Run tests**
```bash
npm test __tests__/lib/intervals/client.test.ts
# Expected:
#   PASS  __tests__/lib/intervals/client.test.ts
#   getAthleteData
#     ✓ combines athlete + wellness + activities into AthleteData
#     ✓ throws if INTERVALS_API_KEY is missing
#   getWorkouts
#     ✓ returns mapped workout list
#   createWorkout
#     ✓ posts base64-encoded zwo and returns id
#   getEvents
#     ✓ fetches events for date range
#   createEvent
#     ✓ posts event and returns created event
#   Tests: 6 passed
```

- [ ] **Step 4: Commit**
```bash
git add lib/intervals/client.ts __tests__/lib/intervals/client.test.ts
git commit -m "feat: add intervals.icu API client with full unit tests"
```

---

### Task 4: Build Model-Agnostic AI Client

**Files:**
- Create: `lib/ai/client.ts`
- Create: `lib/ai/gemini.ts`
- Create: `__tests__/lib/ai/gemini.test.ts`

- [ ] **Step 1: Write lib/ai/client.ts (interface only)**
```typescript
// lib/ai/client.ts
// This file exports the AIClient interface and a factory that picks the
// right implementation based on environment variables.
// Swap from Gemini to any other provider by adding a new implementation
// and updating the factory switch.

export type { AIClient } from '@/lib/types'

import { GeminiClient } from './gemini'

export function createAIClient() {
  // Future: switch on AI_PROVIDER env var to swap implementations
  return new GeminiClient()
}
```

- [ ] **Step 2: Write lib/ai/gemini.ts**
```typescript
// lib/ai/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AIClient, ChatMessage, AthleteData, CoachingProfile, Workout, TrainingPlan, TextEvent } from '@/lib/types'

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not set')
  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
}

function parseJsonFromResponse(text: string): unknown {
  // Strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
  return JSON.parse(cleaned)
}

export class GeminiClient implements AIClient {
  async chat(messages: ChatMessage[], systemPrompt: string): Promise<string> {
    const model = getModel()

    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }))

    const lastMessage = messages[messages.length - 1]
    const chat = model.startChat({
      history,
      systemInstruction: systemPrompt,
    })

    const result = await chat.sendMessage(lastMessage.content)
    return result.response.text()
  }

  async generateWorkout(
    prompt: string,
    athleteData: AthleteData,
    profile: CoachingProfile
  ): Promise<Workout> {
    const model = getModel()
    const systemPrompt = buildSystemPrompt(athleteData, profile)

    const fullPrompt = `${systemPrompt}

Generate a cycling workout based on this request: ${prompt}

Respond with ONLY valid JSON matching this structure (no markdown, no explanation):
{
  "name": "string",
  "description": "string",
  "sportType": "bike",
  "durationSeconds": number,
  "textEventsEnabled": true,
  "blocks": [
    {
      "id": "unique-string",
      "type": "Warmup|SteadyState|IntervalsT|Ramp|Cooldown",
      "duration": number,
      "power": number,
      "powerLow": number,
      "powerHigh": number,
      "cadence": number,
      "repeat": number,
      "onDuration": number,
      "offDuration": number,
      "onPower": number,
      "offPower": number,
      "textEvents": []
    }
  ]
}`

    const result = await model.generateContent(fullPrompt)
    const text = result.response.text()
    return parseJsonFromResponse(text) as Workout
  }

  async generatePlan(
    prompt: string,
    athleteData: AthleteData,
    profile: CoachingProfile
  ): Promise<TrainingPlan> {
    const model = getModel()
    const systemPrompt = buildSystemPrompt(athleteData, profile)

    const fullPrompt = `${systemPrompt}

Generate a multi-week training plan based on: ${prompt}

Respond with ONLY valid JSON matching this structure:
{
  "id": "plan-uuid",
  "name": "string",
  "description": "string",
  "startDate": "YYYY-MM-DD",
  "createdAt": "ISO8601",
  "weeks": [
    {
      "weekNumber": 1,
      "focus": "string",
      "sessions": [
        {
          "id": "unique-string",
          "date": "YYYY-MM-DD",
          "workoutId": null,
          "workoutName": "string",
          "notes": "string"
        }
      ]
    }
  ]
}`

    const result = await model.generateContent(fullPrompt)
    const text = result.response.text()
    return parseJsonFromResponse(text) as TrainingPlan
  }

  async generateTextEvents(workout: Workout): Promise<TextEvent[][]> {
    const model = getModel()

    const prompt = `You are a cycling coach authoring in-workout text prompts (textevents) that appear on a rider's screen.

WORKOUT: ${workout.name}
BLOCKS:
${workout.blocks
  .map(
    (b, i) =>
      `Block ${i + 1}: ${b.type}, ${Math.round(b.duration / 60)}min, ` +
      (b.power ? `${Math.round(b.power * 100)}% FTP` : '') +
      (b.onPower ? `${Math.round(b.onPower * 100)}%/${Math.round((b.offPower ?? 0.5) * 100)}% FTP x${b.repeat}` : '')
  )
  .join('\n')}

DENSITY RULES:
- Warmup/Cooldown: 1-2 textevents (scene-setting start, wind-down end)
- Short interval <3min: 1-2 (start pacing, optional final push)
- Medium 3-10min: 2-3 (start context, mid science/motivation, near-end encouragement)
- Long 10+min: 3-4 every 3-4 min
- Recovery/off intervals: 1 max (recovery cue at start only)
- Nutrition reminders only if total workout >${60 * 60}s

CATEGORIES: physiology | motivation | technique | pacing | recovery | nutrition

Respond with ONLY a JSON array of arrays — one inner array per block, in order:
[
  [
    { "id": "unique-string", "message": "string", "timeOffset": number, "duration": number, "category": "string" }
  ]
]`

    const result = await model.generateContent(prompt)
    const text = result.response.text()
    return parseJsonFromResponse(text) as TextEvent[][]
  }
}

function buildSystemPrompt(athleteData: AthleteData, profile: CoachingProfile): string {
  const activitySummary = athleteData.recentActivities
    .slice(0, 10)
    .map((a) => `  - ${a.date}: ${a.type} ${Math.round(a.durationSeconds / 60)}min TSS:${a.tss}${a.averageHR ? ` HR:${a.averageHR}` : ''}`)
    .join('\n')

  const availableDays = profile.availableDays
    .filter((d) => d.available)
    .map((d) => `${d.day} (max ${d.maxSessionMinutes}min)`)
    .join(', ')

  return `You are a personal cycling coach with access to the athlete's real-time training data.

ATHLETE:
- FTP: ${athleteData.ftp}W | Weight: ${athleteData.weight}kg
- CTL: ${athleteData.ctl} (fitness) | ATL: ${athleteData.atl} (fatigue) | TSB: ${athleteData.tsb} (form)
- Last 14 days:
${activitySummary}

COACHING PROFILE:
- Goals: ${profile.goals.join(', ')}
- Constraints: ${profile.constraints.join(', ')}
- Available: ${availableDays}
- Preferences: ${profile.preferences.join(', ')}
- Target events: ${profile.targetEvents.join(', ')}

RULES:
- Prefer short structured sessions (45-60 min) over long Zone 2
- Sweet spot and VO2 max are primary zones
- Always explain the science in textevents
- To output a workout, wrap it: {"type":"workout","data":{...WorkoutJSON}}
- To output a plan, wrap it: {"type":"plan","data":{...PlanJSON}}`
}
```

- [ ] **Step 3: Write __tests__/lib/ai/gemini.test.ts**
```typescript
// __tests__/lib/ai/gemini.test.ts
import { GeminiClient } from '@/lib/ai/gemini'
import type { Workout, AthleteData, CoachingProfile, ChatMessage } from '@/lib/types'

// Mock @google/generative-ai
jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: jest.fn(),
        startChat: jest.fn(),
      }),
    })),
  }
})

import { GoogleGenerativeAI } from '@google/generative-ai'

const mockAthlete: AthleteData = {
  id: 1, name: 'Rich', ftp: 280, weight: 72,
  ctl: 65, atl: 70, tsb: -5, recentActivities: [],
}

const mockProfile: CoachingProfile = {
  availableDays: [{ day: 'Tuesday', available: true, maxSessionMinutes: 60 }],
  goals: ['build FTP'],
  constraints: ['time-poor'],
  preferences: ['structured indoors'],
  targetEvents: [],
  updatedAt: '2026-05-23T00:00:00Z',
}

const mockWorkout: Workout = {
  name: 'Test Workout',
  description: 'desc',
  sportType: 'bike',
  durationSeconds: 3600,
  textEventsEnabled: true,
  blocks: [
    { id: 'b1', type: 'SteadyState', duration: 600, power: 0.88, textEvents: [] },
  ],
}

function getMockModel() {
  const instance = new (GoogleGenerativeAI as jest.MockedClass<typeof GoogleGenerativeAI>)('key')
  return instance.getGenerativeModel({ model: 'gemini-1.5-flash' }) as jest.Mocked<ReturnType<typeof instance.getGenerativeModel>>
}

beforeEach(() => {
  process.env.GEMINI_API_KEY = 'test-key'
  jest.clearAllMocks()
})

describe('GeminiClient.generateWorkout', () => {
  it('parses JSON response into Workout', async () => {
    const mockModel = getMockModel()
    mockModel.generateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(mockWorkout) },
    } as never)

    const client = new GeminiClient()
    const result = await client.generateWorkout('45 min sweet spot', mockAthlete, mockProfile)

    expect(result.name).toBe('Test Workout')
    expect(result.sportType).toBe('bike')
  })

  it('handles JSON wrapped in markdown code fences', async () => {
    const mockModel = getMockModel()
    mockModel.generateContent.mockResolvedValueOnce({
      response: { text: () => '```json\n' + JSON.stringify(mockWorkout) + '\n```' },
    } as never)

    const client = new GeminiClient()
    const result = await client.generateWorkout('test', mockAthlete, mockProfile)
    expect(result.name).toBe('Test Workout')
  })
})

describe('GeminiClient.generateTextEvents', () => {
  it('returns array-of-arrays matching block count', async () => {
    const mockModel = getMockModel()
    const fakeEvents = [[{ id: 'te1', message: 'Push now', timeOffset: 0, duration: 10, category: 'motivation' }]]
    mockModel.generateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(fakeEvents) },
    } as never)

    const client = new GeminiClient()
    const result = await client.generateTextEvents(mockWorkout)

    expect(Array.isArray(result)).toBe(true)
    expect(result[0][0].category).toBe('motivation')
  })
})

describe('GeminiClient.chat', () => {
  it('calls sendMessage and returns response text', async () => {
    const mockModel = getMockModel()
    const mockSendMessage = jest.fn().mockResolvedValueOnce({
      response: { text: () => 'Here is your plan...' },
    })
    mockModel.startChat.mockReturnValueOnce({ sendMessage: mockSendMessage } as never)

    const messages: ChatMessage[] = [
      { id: '1', role: 'user', content: 'Plan my week', timestamp: '2026-05-23T00:00:00Z' },
    ]

    const client = new GeminiClient()
    const result = await client.chat(messages, 'You are a coach')

    expect(result).toBe('Here is your plan...')
    expect(mockSendMessage).toHaveBeenCalledWith('Plan my week')
  })
})
```

- [ ] **Step 4: Run tests**
```bash
npm test __tests__/lib/ai/gemini.test.ts
# Expected: 4 tests passed (generateWorkout x2, generateTextEvents, chat)
```

- [ ] **Step 5: Commit**
```bash
git add lib/ai/client.ts lib/ai/gemini.ts __tests__/lib/ai/gemini.test.ts
git commit -m "feat: add model-agnostic AI client with Gemini implementation"
```

---

### Task 5: Build Upstash Redis Client

**Files:**
- Create: `lib/redis/client.ts`
- Create: `__tests__/lib/redis/client.test.ts`

- [ ] **Step 1: Write lib/redis/client.ts**
```typescript
// lib/redis/client.ts
import { Redis } from '@upstash/redis'
import type { CoachingProfile, TrainingPlan } from '@/lib/types'

function getRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set')
  }
  return new Redis({ url, token })
}

const PROFILE_KEY = 'coaching:profile'
const PLAN_KEY_PREFIX = 'plan:'
const PLAN_INDEX_KEY = 'plan:index'

export async function getProfile(): Promise<CoachingProfile | null> {
  const redis = getRedis()
  return redis.get<CoachingProfile>(PROFILE_KEY)
}

export async function setProfile(profile: CoachingProfile): Promise<void> {
  const redis = getRedis()
  await redis.set(PROFILE_KEY, profile)
}

export async function getPlanDraft(id: string): Promise<TrainingPlan | null> {
  const redis = getRedis()
  return redis.get<TrainingPlan>(`${PLAN_KEY_PREFIX}${id}`)
}

export async function setPlanDraft(id: string, plan: TrainingPlan): Promise<void> {
  const redis = getRedis()
  await Promise.all([
    redis.set(`${PLAN_KEY_PREFIX}${id}`, plan),
    redis.sadd(PLAN_INDEX_KEY, id),
  ])
}

export async function listPlanDrafts(): Promise<TrainingPlan[]> {
  const redis = getRedis()
  const ids = await redis.smembers(PLAN_INDEX_KEY)
  if (!ids || ids.length === 0) return []

  const plans = await Promise.all(
    (ids as string[]).map((id) => redis.get<TrainingPlan>(`${PLAN_KEY_PREFIX}${id}`))
  )
  return plans.filter((p): p is TrainingPlan => p !== null)
}

export async function deletePlanDraft(id: string): Promise<void> {
  const redis = getRedis()
  await Promise.all([
    redis.del(`${PLAN_KEY_PREFIX}${id}`),
    redis.srem(PLAN_INDEX_KEY, id),
  ])
}
```

- [ ] **Step 2: Write __tests__/lib/redis/client.test.ts**
```typescript
// __tests__/lib/redis/client.test.ts
import type { CoachingProfile, TrainingPlan } from '@/lib/types'

// Mock @upstash/redis
const mockGet = jest.fn()
const mockSet = jest.fn()
const mockSadd = jest.fn()
const mockSmembers = jest.fn()
const mockSrem = jest.fn()
const mockDel = jest.fn()

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: mockGet,
    set: mockSet,
    sadd: mockSadd,
    smembers: mockSmembers,
    srem: mockSrem,
    del: mockDel,
  })),
}))

import { getProfile, setProfile, getPlanDraft, setPlanDraft, listPlanDrafts, deletePlanDraft } from '@/lib/redis/client'

beforeEach(() => {
  jest.clearAllMocks()
  process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
})

const mockProfile: CoachingProfile = {
  availableDays: [{ day: 'Tuesday', available: true, maxSessionMinutes: 60 }],
  goals: ['build FTP'],
  constraints: [],
  preferences: [],
  targetEvents: [],
  updatedAt: '2026-05-23T00:00:00Z',
}

const mockPlan: TrainingPlan = {
  id: 'plan-1',
  name: '8-week FTP Builder',
  description: 'Build FTP over 8 weeks',
  startDate: '2026-06-01',
  weeks: [],
  createdAt: '2026-05-23T00:00:00Z',
}

describe('getProfile', () => {
  it('returns null when profile not set', async () => {
    mockGet.mockResolvedValueOnce(null)
    const result = await getProfile()
    expect(result).toBeNull()
  })

  it('returns coaching profile', async () => {
    mockGet.mockResolvedValueOnce(mockProfile)
    const result = await getProfile()
    expect(result?.goals).toContain('build FTP')
  })
})

describe('setProfile', () => {
  it('stores profile at correct key', async () => {
    mockSet.mockResolvedValueOnce('OK')
    await setProfile(mockProfile)
    expect(mockSet).toHaveBeenCalledWith('coaching:profile', mockProfile)
  })
})

describe('getPlanDraft / setPlanDraft', () => {
  it('stores and retrieves plan draft', async () => {
    mockSet.mockResolvedValueOnce('OK')
    mockSadd.mockResolvedValueOnce(1)
    await setPlanDraft('plan-1', mockPlan)
    expect(mockSet).toHaveBeenCalledWith('plan:plan-1', mockPlan)
    expect(mockSadd).toHaveBeenCalledWith('plan:index', 'plan-1')

    mockGet.mockResolvedValueOnce(mockPlan)
    const result = await getPlanDraft('plan-1')
    expect(result?.name).toBe('8-week FTP Builder')
  })
})

describe('listPlanDrafts', () => {
  it('returns empty array when no plans', async () => {
    mockSmembers.mockResolvedValueOnce([])
    const result = await listPlanDrafts()
    expect(result).toEqual([])
  })

  it('fetches all plans by id', async () => {
    mockSmembers.mockResolvedValueOnce(['plan-1', 'plan-2'])
    mockGet.mockResolvedValueOnce(mockPlan).mockResolvedValueOnce(null)
    const result = await listPlanDrafts()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('plan-1')
  })
})

describe('deletePlanDraft', () => {
  it('removes plan from store and index', async () => {
    mockDel.mockResolvedValueOnce(1)
    mockSrem.mockResolvedValueOnce(1)
    await deletePlanDraft('plan-1')
    expect(mockDel).toHaveBeenCalledWith('plan:plan-1')
    expect(mockSrem).toHaveBeenCalledWith('plan:index', 'plan-1')
  })
})
```

- [ ] **Step 3: Run tests**
```bash
npm test __tests__/lib/redis/client.test.ts
# Expected: 7 tests passed
```

- [ ] **Step 4: Commit**
```bash
git add lib/redis/client.ts __tests__/lib/redis/client.test.ts
git commit -m "feat: add Upstash Redis client for coaching profile and plan drafts"
```

---

### Task 6: Build .zwo XML Generator

**Files:**
- Create: `lib/zwo/generator.ts`
- Create: `__tests__/lib/zwo/generator.test.ts`

- [ ] **Step 1: Write lib/zwo/generator.ts**
```typescript
// lib/zwo/generator.ts
// Generates Zwift .zwo XML from our internal Workout type.
// Format reference: Auuki src/workouts/zwo.js
// Key attribute names mirror the Zwift spec exactly (capitalised).

import type { Workout, IntervalBlock, TextEvent } from '@/lib/types'

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderTextEvent(te: TextEvent): string {
  return `            <textevent timeoffset="${te.timeOffset}" message="${escapeXml(te.message)}" duration="${te.duration}"/>`
}

function renderTextEvents(textEvents: TextEvent[]): string {
  if (!textEvents || textEvents.length === 0) return ''
  return '\n' + textEvents.map(renderTextEvent).join('\n')
}

function hasTextEvents(block: IntervalBlock): boolean {
  return block.textEvents && block.textEvents.length > 0
}

function blockTagClose(block: IntervalBlock): string {
  if (hasTextEvents(block)) {
    return `>${renderTextEvents(block.textEvents)}\n        </` + block.type + '>'
  }
  return ' />'
}

function renderWarmup(block: IntervalBlock): string {
  const powerLow = (block.powerLow ?? 0.45).toFixed(2)
  const powerHigh = (block.powerHigh ?? 0.75).toFixed(2)
  const cadence = block.cadence ? ` Cadence="${block.cadence}"` : ''
  const close = blockTagClose(block)
  return `        <Warmup Duration="${block.duration}" PowerLow="${powerLow}" PowerHigh="${powerHigh}"${cadence}${close}`
}

function renderCooldown(block: IntervalBlock): string {
  // Zwift Cooldown: PowerHigh is start (high), PowerLow is end (low)
  // In our model: powerHigh = starting point (higher), powerLow = ending point (lower)
  const powerHigh = (block.powerHigh ?? 0.75).toFixed(2)
  const powerLow = (block.powerLow ?? 0.35).toFixed(2)
  const cadence = block.cadence ? ` Cadence="${block.cadence}"` : ''
  const close = blockTagClose(block)
  return `        <Cooldown Duration="${block.duration}" PowerHigh="${powerHigh}" PowerLow="${powerLow}"${cadence}${close}`
}

function renderSteadyState(block: IntervalBlock): string {
  const power = (block.power ?? 0.75).toFixed(2)
  const cadence = block.cadence ? ` Cadence="${block.cadence}"` : ''
  const close = blockTagClose(block)
  return `        <SteadyState Duration="${block.duration}" Power="${power}"${cadence}${close}`
}

function renderRamp(block: IntervalBlock): string {
  // Ramp uses same attributes as Warmup in the Zwift spec
  const powerLow = (block.powerLow ?? 0.6).toFixed(2)
  const powerHigh = (block.powerHigh ?? 1.0).toFixed(2)
  const cadence = block.cadence ? ` Cadence="${block.cadence}"` : ''
  const close = blockTagClose(block)
  return `        <Ramp Duration="${block.duration}" PowerLow="${powerLow}" PowerHigh="${powerHigh}"${cadence}${close}`
}

function renderIntervalsT(block: IntervalBlock): string {
  const repeat = block.repeat ?? 1
  const onDuration = block.onDuration ?? 180
  const offDuration = block.offDuration ?? 180
  const onPower = (block.onPower ?? 1.1).toFixed(2)
  const offPower = (block.offPower ?? 0.5).toFixed(2)
  const cadence = block.cadence ? ` Cadence="${block.cadence}"` : ''
  const close = blockTagClose(block)
  return `        <IntervalsT Repeat="${repeat}" OnDuration="${onDuration}" OffDuration="${offDuration}" OnPower="${onPower}" OffPower="${offPower}"${cadence}${close}`
}

function renderBlock(block: IntervalBlock): string {
  switch (block.type) {
    case 'Warmup':       return renderWarmup(block)
    case 'Cooldown':     return renderCooldown(block)
    case 'SteadyState':  return renderSteadyState(block)
    case 'Ramp':         return renderRamp(block)
    case 'IntervalsT':   return renderIntervalsT(block)
    default:
      throw new Error(`Unknown block type: ${(block as IntervalBlock).type}`)
  }
}

export function generateZwo(workout: Workout): string {
  const blocks = workout.textEventsEnabled
    ? workout.blocks
    : workout.blocks.map((b) => ({ ...b, textEvents: [] }))

  const blockXml = blocks.map(renderBlock).join('\n')

  return `<workout_file>
    <author>Workout Builder</author>
    <name>${escapeXml(workout.name)}</name>
    <description>${escapeXml(workout.description)}</description>
    <sportType>bike</sportType>
    <tags></tags>
    <workout>
${blockXml}
    </workout>
</workout_file>`
}
```

- [ ] **Step 2: Write __tests__/lib/zwo/generator.test.ts**
```typescript
// __tests__/lib/zwo/generator.test.ts
import { generateZwo } from '@/lib/zwo/generator'
import type { Workout, IntervalBlock } from '@/lib/types'

function makeWorkout(blocks: IntervalBlock[]): Workout {
  return {
    name: 'Test Workout',
    description: 'A test',
    sportType: 'bike',
    durationSeconds: blocks.reduce((sum, b) => sum + b.duration, 0),
    blocks,
    textEventsEnabled: true,
  }
}

describe('generateZwo', () => {
  it('generates valid XML root element', () => {
    const xml = generateZwo(makeWorkout([]))
    expect(xml).toContain('<workout_file>')
    expect(xml).toContain('</workout_file>')
    expect(xml).toContain('<name>Test Workout</name>')
    expect(xml).toContain('<sportType>bike</sportType>')
  })

  it('renders Warmup block correctly', () => {
    const block: IntervalBlock = {
      id: 'b1', type: 'Warmup', duration: 600,
      powerLow: 0.45, powerHigh: 0.75, textEvents: [],
    }
    const xml = generateZwo(makeWorkout([block]))
    expect(xml).toContain('<Warmup Duration="600" PowerLow="0.45" PowerHigh="0.75"')
  })

  it('renders Cooldown block correctly', () => {
    const block: IntervalBlock = {
      id: 'b1', type: 'Cooldown', duration: 300,
      powerHigh: 0.75, powerLow: 0.35, textEvents: [],
    }
    const xml = generateZwo(makeWorkout([block]))
    // Zwift Cooldown: PowerHigh is the start (higher), PowerLow is end
    expect(xml).toContain('<Cooldown Duration="300" PowerHigh="0.75" PowerLow="0.35"')
  })

  it('renders SteadyState block correctly', () => {
    const block: IntervalBlock = {
      id: 'b1', type: 'SteadyState', duration: 600,
      power: 0.88, cadence: 90, textEvents: [],
    }
    const xml = generateZwo(makeWorkout([block]))
    expect(xml).toContain('<SteadyState Duration="600" Power="0.88" Cadence="90"')
  })

  it('renders Ramp block correctly', () => {
    const block: IntervalBlock = {
      id: 'b1', type: 'Ramp', duration: 1200,
      powerLow: 0.60, powerHigh: 1.00, textEvents: [],
    }
    const xml = generateZwo(makeWorkout([block]))
    expect(xml).toContain('<Ramp Duration="1200" PowerLow="0.60" PowerHigh="1.00"')
  })

  it('renders IntervalsT block correctly', () => {
    const block: IntervalBlock = {
      id: 'b1', type: 'IntervalsT', duration: 1800,
      repeat: 5, onDuration: 180, offDuration: 180,
      onPower: 1.10, offPower: 0.55, textEvents: [],
    }
    const xml = generateZwo(makeWorkout([block]))
    expect(xml).toContain(
      '<IntervalsT Repeat="5" OnDuration="180" OffDuration="180" OnPower="1.10" OffPower="0.55"'
    )
  })

  it('embeds textevents inside block tags', () => {
    const block: IntervalBlock = {
      id: 'b1', type: 'SteadyState', duration: 600, power: 0.88,
      textEvents: [
        { id: 'te1', message: 'Push now', timeOffset: 0, duration: 10, category: 'motivation' },
        { id: 'te2', message: 'Halfway', timeOffset: 300, duration: 10, category: 'physiology' },
      ],
    }
    const xml = generateZwo(makeWorkout([block]))
    expect(xml).toContain('<textevent timeoffset="0" message="Push now" duration="10"/>')
    expect(xml).toContain('<textevent timeoffset="300" message="Halfway" duration="10"/>')
    expect(xml).toContain('</SteadyState>')
    // Should not self-close when there are textevents
    expect(xml).not.toContain('<SteadyState Duration="600" Power="0.88" />')
  })

  it('omits textevents when textEventsEnabled is false', () => {
    const block: IntervalBlock = {
      id: 'b1', type: 'SteadyState', duration: 600, power: 0.88,
      textEvents: [{ id: 'te1', message: 'Push', timeOffset: 0, duration: 10, category: 'motivation' }],
    }
    const workout = makeWorkout([block])
    workout.textEventsEnabled = false
    const xml = generateZwo(workout)
    expect(xml).not.toContain('<textevent')
    expect(xml).toContain('<SteadyState Duration="600" Power="0.88" />')
  })

  it('escapes special characters in name and description', () => {
    const workout = makeWorkout([])
    workout.name = 'Rich & Fast <Intervals>'
    workout.description = 'Use "max" effort'
    const xml = generateZwo(workout)
    expect(xml).toContain('<name>Rich &amp; Fast &lt;Intervals&gt;</name>')
    expect(xml).toContain('<description>Use &quot;max&quot; effort</description>')
  })
})
```

- [ ] **Step 3: Run tests**
```bash
npm test __tests__/lib/zwo/generator.test.ts
# Expected: 8 tests passed
```

- [ ] **Step 4: Commit**
```bash
git add lib/zwo/generator.ts __tests__/lib/zwo/generator.test.ts
git commit -m "feat: add .zwo XML generator for all 5 block types with textevent support"
```

---

### Task 7: Build All API Routes

**Files:**
- Create: `app/api/intervals/athlete/route.ts`
- Create: `app/api/intervals/workouts/route.ts`
- Create: `app/api/intervals/events/route.ts`
- Create: `app/api/ai/chat/route.ts`
- Create: `app/api/ai/generate-workout/route.ts`
- Create: `app/api/ai/generate-plan/route.ts`
- Create: `app/api/ai/generate-textevents/route.ts`
- Create: `app/api/profile/route.ts`

- [ ] **Step 1: Write app/api/intervals/athlete/route.ts**
```typescript
// app/api/intervals/athlete/route.ts
import { NextResponse } from 'next/server'
import { getAthleteData } from '@/lib/intervals/client'

export async function GET() {
  try {
    const data = await getAthleteData()
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Write app/api/intervals/workouts/route.ts**
```typescript
// app/api/intervals/workouts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getWorkouts, createWorkout } from '@/lib/intervals/client'
import { generateZwo } from '@/lib/zwo/generator'
import type { Workout } from '@/lib/types'

export async function GET() {
  try {
    const workouts = await getWorkouts()
    return NextResponse.json(workouts)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const workout: Workout = await req.json()
    const zwoXml = generateZwo(workout)
    const result = await createWorkout(workout, zwoXml)
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 3: Write app/api/intervals/events/route.ts**
```typescript
// app/api/intervals/events/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getEvents, createEvent } from '@/lib/intervals/client'
import type { CalendarEvent } from '@/lib/intervals/client'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const oldest = searchParams.get('oldest') ?? ''
    const newest = searchParams.get('newest') ?? ''
    if (!oldest || !newest) {
      return NextResponse.json({ error: 'oldest and newest query params required' }, { status: 400 })
    }
    const events = await getEvents(oldest, newest)
    return NextResponse.json(events)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const event: Omit<CalendarEvent, 'id'> = await req.json()
    const result = await createEvent(event)
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 4: Write app/api/ai/chat/route.ts**
```typescript
// app/api/ai/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAIClient } from '@/lib/ai/client'
import type { ChatMessage } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const { messages, systemPrompt }: { messages: ChatMessage[]; systemPrompt: string } = await req.json()
    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 })
    }
    const client = createAIClient()
    const response = await client.chat(messages, systemPrompt ?? '')
    return NextResponse.json({ content: response })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 5: Write app/api/ai/generate-workout/route.ts**
```typescript
// app/api/ai/generate-workout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAIClient } from '@/lib/ai/client'
import type { AthleteData, CoachingProfile } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const {
      prompt,
      athleteData,
      profile,
    }: { prompt: string; athleteData: AthleteData; profile: CoachingProfile } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: 'prompt required' }, { status: 400 })
    }
    const client = createAIClient()
    const workout = await client.generateWorkout(prompt, athleteData, profile)
    return NextResponse.json(workout)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 6: Write app/api/ai/generate-plan/route.ts**
```typescript
// app/api/ai/generate-plan/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAIClient } from '@/lib/ai/client'
import type { AthleteData, CoachingProfile } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const {
      prompt,
      athleteData,
      profile,
    }: { prompt: string; athleteData: AthleteData; profile: CoachingProfile } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: 'prompt required' }, { status: 400 })
    }
    const client = createAIClient()
    const plan = await client.generatePlan(prompt, athleteData, profile)
    return NextResponse.json(plan)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 7: Write app/api/ai/generate-textevents/route.ts**
```typescript
// app/api/ai/generate-textevents/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAIClient } from '@/lib/ai/client'
import type { Workout } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const { workout }: { workout: Workout } = await req.json()
    if (!workout) {
      return NextResponse.json({ error: 'workout required' }, { status: 400 })
    }
    const client = createAIClient()
    const textEventsByBlock = await client.generateTextEvents(workout)
    return NextResponse.json({ textEventsByBlock })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 8: Write app/api/profile/route.ts**
```typescript
// app/api/profile/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getProfile, setProfile } from '@/lib/redis/client'
import type { CoachingProfile } from '@/lib/types'

export async function GET() {
  try {
    const profile = await getProfile()
    return NextResponse.json(profile)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const profile: CoachingProfile = await req.json()
    if (!profile || !profile.availableDays) {
      return NextResponse.json({ error: 'Invalid profile' }, { status: 400 })
    }
    profile.updatedAt = new Date().toISOString()
    await setProfile(profile)
    return NextResponse.json(profile)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 9: Verify build**
```bash
npm run build
# Expected: Build successful, all API routes compiled
```

- [ ] **Step 10: Commit**
```bash
git add app/api/
git commit -m "feat: add all API routes for intervals.icu, AI, and coaching profile"
```

---

### Task 8: Build Navigation Shell

**Files:**
- Modify: `app/layout.tsx`
- Create: `components/nav/Sidebar.tsx`
- Create: `components/nav/BottomNav.tsx`

- [ ] **Step 1: Write components/nav/Sidebar.tsx**
```tsx
// components/nav/Sidebar.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/coach',   label: 'Coach',   icon: '💬' },
  { href: '/plan',    label: 'Plan',    icon: '📅' },
  { href: '/create',  label: 'Create',  icon: '✏️'  },
  { href: '/library', label: 'Library', icon: '📚' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <nav className="hidden md:flex flex-col w-56 min-h-screen bg-zinc-900 border-r border-zinc-800 pt-8 pb-4 px-3 gap-1">
      <div className="px-3 mb-8">
        <h1 className="text-white font-bold text-lg tracking-tight">Workout Builder</h1>
        <p className="text-zinc-500 text-xs mt-0.5">Powered by intervals.icu</p>
      </div>
      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              active
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 2: Write components/nav/BottomNav.tsx**
```tsx
// components/nav/BottomNav.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/coach',   label: 'Coach',   icon: '💬' },
  { href: '/plan',    label: 'Plan',    icon: '📅' },
  { href: '/create',  label: 'Create',  icon: '✏️'  },
  { href: '/library', label: 'Library', icon: '📚' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 border-t border-zinc-800 flex">
      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-1 text-xs font-medium transition-colors ${
              active ? 'text-indigo-400' : 'text-zinc-500'
            }`}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 3: Update app/layout.tsx**
```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/nav/Sidebar'
import { BottomNav } from '@/components/nav/BottomNav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Workout Builder',
  description: 'AI-powered cycling training companion',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-zinc-950 text-zinc-100 min-h-screen`}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 flex flex-col min-h-screen pb-16 md:pb-0">
            {children}
          </main>
        </div>
        <BottomNav />
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Write app/page.tsx (redirect)**
```tsx
// app/page.tsx
import { redirect } from 'next/navigation'
export default function Home() {
  redirect('/coach')
}
```

- [ ] **Step 5: Commit**
```bash
git add app/layout.tsx app/page.tsx components/nav/
git commit -m "feat: add responsive navigation shell (sidebar desktop, bottom tabs mobile)"
```

---

### Task 9: Build Coaching Profile Onboarding

**Files:**
- Create: `app/coach/page.tsx` (initial stub, onboarding focus)
- Create: `components/coach/OnboardingForm.tsx`

- [ ] **Step 1: Write components/coach/OnboardingForm.tsx**
```tsx
// components/coach/OnboardingForm.tsx
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
```

- [ ] **Step 2: Write app/coach/page.tsx (onboarding gate)**
```tsx
// app/coach/page.tsx
'use client'
import { useState, useEffect } from 'react'
import type { CoachingProfile } from '@/lib/types'
import { OnboardingForm } from '@/components/coach/OnboardingForm'

export default function CoachPage() {
  const [profile, setProfile] = useState<CoachingProfile | null | 'loading'>('loading')

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data) => setProfile(data ?? null))
      .catch(() => setProfile(null))
  }, [])

  if (profile === 'loading') {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <div className="text-zinc-500 text-sm">Loading...</div>
      </div>
    )
  }

  if (!profile) {
    return <OnboardingForm onComplete={(p) => setProfile(p)} />
  }

  // Full chat UI added in Task 16
  return (
    <div className="flex items-center justify-center h-full min-h-[50vh]">
      <div className="text-zinc-500 text-sm">Coach UI — Task 16</div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**
```bash
git add app/coach/page.tsx components/coach/OnboardingForm.tsx
git commit -m "feat: add coaching profile onboarding with multi-step form"
```

---

### Task 10: Build Library Mode

**Files:**
- Create: `app/library/page.tsx`
- Create: `components/library/WorkoutList.tsx`
- Create: `components/library/WorkoutCard.tsx`
- Create: `components/library/FilterBar.tsx`

- [ ] **Step 1: Write components/library/FilterBar.tsx**
```tsx
// components/library/FilterBar.tsx
'use client'

export type WorkoutType = 'All' | 'Sweet Spot' | 'VO2 Max' | 'Tempo' | 'Recovery' | 'Endurance'
export type DurationFilter = 'All' | '30' | '45' | '60' | '90+'

interface FilterBarProps {
  search: string
  onSearchChange: (v: string) => void
  type: WorkoutType
  onTypeChange: (v: WorkoutType) => void
  duration: DurationFilter
  onDurationChange: (v: DurationFilter) => void
}

const TYPES: WorkoutType[] = ['All', 'Sweet Spot', 'VO2 Max', 'Tempo', 'Recovery', 'Endurance']
const DURATIONS: DurationFilter[] = ['All', '30', '45', '60', '90+']

export function FilterBar({ search, onSearchChange, type, onTypeChange, duration, onDurationChange }: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 mb-6">
      <input
        type="search"
        placeholder="Search workouts..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 w-full"
      />
      <div className="flex gap-2 flex-wrap">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => onTypeChange(t)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              type === t ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {DURATIONS.map((d) => (
          <button
            key={d}
            onClick={() => onDurationChange(d)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              duration === d ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {d === 'All' ? 'Any length' : `${d} min`}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write components/library/WorkoutCard.tsx**
```tsx
// components/library/WorkoutCard.tsx
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
  if (name.includes('vo2') || name.includes('v02')) return { label: 'VO2 Max', color: 'bg-red-600' }
  if (name.includes('tempo')) return { label: 'Tempo', color: 'bg-orange-600' }
  if (name.includes('recovery') || name.includes('easy')) return { label: 'Recovery', color: 'bg-blue-700' }
  if (name.includes('endurance') || name.includes('base') || name.includes('z2')) return { label: 'Endurance', color: 'bg-green-700' }
  return { label: 'Mixed', color: 'bg-zinc-600' }
}

// Minimal SVG graph for blocks — simplified since we don't have block data from the API list
function MiniGraph({ workout }: { workout: Workout }) {
  if (!workout.blocks || workout.blocks.length === 0) {
    // Fallback: single bar at 75%
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
        // Height based on power (scaled 0–1.5 FTP → 0–30px)
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
```

- [ ] **Step 3: Write components/library/WorkoutList.tsx**
```tsx
// components/library/WorkoutList.tsx
'use client'
import type { Workout } from '@/lib/types'
import { WorkoutCard } from './WorkoutCard'

interface WorkoutListProps {
  workouts: Workout[]
  onAddToPlan?: (workout: Workout) => void
}

export function WorkoutList({ workouts, onAddToPlan }: WorkoutListProps) {
  if (workouts.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-500 text-sm">
        No workouts found. Try adjusting your filters or create a new workout.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {workouts.map((workout) => (
        <WorkoutCard key={workout.id ?? workout.name} workout={workout} onAddToPlan={onAddToPlan} />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Write app/library/page.tsx**
```tsx
// app/library/page.tsx
'use client'
import { useState, useEffect, useMemo } from 'react'
import type { Workout } from '@/lib/types'
import { FilterBar, WorkoutType, DurationFilter } from '@/components/library/FilterBar'
import { WorkoutList } from '@/components/library/WorkoutList'

function matchesDuration(workout: Workout, filter: DurationFilter): boolean {
  const minutes = workout.durationSeconds / 60
  switch (filter) {
    case '30': return minutes <= 35
    case '45': return minutes > 35 && minutes <= 52
    case '60': return minutes > 52 && minutes <= 75
    case '90+': return minutes > 75
    default: return true
  }
}

function matchesType(workout: Workout, type: WorkoutType): boolean {
  if (type === 'All') return true
  return workout.name.toLowerCase().includes(type.toLowerCase())
}

export default function LibraryPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [type, setType] = useState<WorkoutType>('All')
  const [duration, setDuration] = useState<DurationFilter>('All')

  useEffect(() => {
    fetch('/api/intervals/workouts')
      .then((r) => r.json())
      .then((data) => { setWorkouts(data); setLoading(false) })
      .catch(() => { setError('Failed to load workouts'); setLoading(false) })
  }, [])

  const filtered = useMemo(() => {
    return workouts
      .filter((w) => w.name.toLowerCase().includes(search.toLowerCase()))
      .filter((w) => matchesType(w, type))
      .filter((w) => matchesDuration(w, duration))
  }, [workouts, search, type, duration])

  return (
    <div className="px-4 py-6 md:px-8 max-w-5xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Workout Library</h1>
        <p className="text-zinc-400 text-sm mt-1">
          {loading ? 'Loading...' : `${workouts.length} workouts from intervals.icu`}
        </p>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        type={type}
        onTypeChange={setType}
        duration={duration}
        onDurationChange={setDuration}
      />

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-400 text-sm mb-4">
          {error}
        </div>
      )}

      {!loading && <WorkoutList workouts={filtered} />}
    </div>
  )
}
```

- [ ] **Step 5: Commit**
```bash
git add app/library/page.tsx components/library/
git commit -m "feat: add Library mode with search, type/duration filters, and workout cards"
```

---

### Task 11: Build Interval Data Utilities

**Files:**
- Create: `lib/zwo/intervals.ts`
- Create: `__tests__/lib/zwo/intervals.test.ts`

- [ ] **Step 1: Write lib/zwo/intervals.ts**
```typescript
// lib/zwo/intervals.ts
// Pure functions for manipulating workouts in memory.
// No side effects — all functions return new objects.

import type { Workout, IntervalBlock } from '@/lib/types'

export function addBlock(workout: Workout, block: IntervalBlock): Workout {
  return {
    ...workout,
    blocks: [...workout.blocks, block],
    durationSeconds: workout.durationSeconds + block.duration,
  }
}

export function removeBlock(workout: Workout, id: string): Workout {
  const removed = workout.blocks.find((b) => b.id === id)
  return {
    ...workout,
    blocks: workout.blocks.filter((b) => b.id !== id),
    durationSeconds: workout.durationSeconds - (removed?.duration ?? 0),
  }
}

export function reorderBlocks(workout: Workout, fromIndex: number, toIndex: number): Workout {
  const blocks = [...workout.blocks]
  const [moved] = blocks.splice(fromIndex, 1)
  blocks.splice(toIndex, 0, moved)
  return { ...workout, blocks }
}

export function updateBlock(workout: Workout, id: string, changes: Partial<IntervalBlock>): Workout {
  const blocks = workout.blocks.map((b) => (b.id === id ? { ...b, ...changes } : b))
  const totalDuration = calculateDuration(blocks)
  return { ...workout, blocks, durationSeconds: totalDuration }
}

export function calculateDuration(blocks: IntervalBlock[]): number {
  return blocks.reduce((sum, block) => {
    if (block.type === 'IntervalsT') {
      const repeat = block.repeat ?? 1
      const on = block.onDuration ?? 0
      const off = block.offDuration ?? 0
      return sum + repeat * (on + off)
    }
    return sum + block.duration
  }, 0)
}
```

- [ ] **Step 2: Write __tests__/lib/zwo/intervals.test.ts**
```typescript
// __tests__/lib/zwo/intervals.test.ts
import { addBlock, removeBlock, reorderBlocks, updateBlock, calculateDuration } from '@/lib/zwo/intervals'
import type { Workout, IntervalBlock } from '@/lib/types'

function block(id: string, duration: number, type: IntervalBlock['type'] = 'SteadyState'): IntervalBlock {
  return { id, type, duration, power: 0.88, textEvents: [] }
}

const base: Workout = {
  name: 'Test',
  description: '',
  sportType: 'bike',
  durationSeconds: 600,
  blocks: [block('a', 300), block('b', 300)],
  textEventsEnabled: true,
}

describe('addBlock', () => {
  it('appends block and updates duration', () => {
    const result = addBlock(base, block('c', 120))
    expect(result.blocks).toHaveLength(3)
    expect(result.blocks[2].id).toBe('c')
    expect(result.durationSeconds).toBe(720)
  })

  it('does not mutate original', () => {
    addBlock(base, block('c', 120))
    expect(base.blocks).toHaveLength(2)
  })
})

describe('removeBlock', () => {
  it('removes block by id and updates duration', () => {
    const result = removeBlock(base, 'a')
    expect(result.blocks).toHaveLength(1)
    expect(result.blocks[0].id).toBe('b')
    expect(result.durationSeconds).toBe(300)
  })

  it('is a no-op for non-existent id', () => {
    const result = removeBlock(base, 'z')
    expect(result.blocks).toHaveLength(2)
    expect(result.durationSeconds).toBe(600)
  })
})

describe('reorderBlocks', () => {
  it('moves block from index 0 to index 1', () => {
    const result = reorderBlocks(base, 0, 1)
    expect(result.blocks[0].id).toBe('b')
    expect(result.blocks[1].id).toBe('a')
  })

  it('does not mutate original', () => {
    reorderBlocks(base, 0, 1)
    expect(base.blocks[0].id).toBe('a')
  })
})

describe('updateBlock', () => {
  it('updates specified fields only', () => {
    const result = updateBlock(base, 'a', { power: 0.95, cadence: 90 })
    expect(result.blocks[0].power).toBe(0.95)
    expect(result.blocks[0].cadence).toBe(90)
    expect(result.blocks[0].id).toBe('a')
    // Other block unchanged
    expect(result.blocks[1].power).toBe(0.88)
  })

  it('recalculates total duration when duration changes', () => {
    const result = updateBlock(base, 'a', { duration: 600 })
    expect(result.durationSeconds).toBe(900)
  })
})

describe('calculateDuration', () => {
  it('sums simple block durations', () => {
    expect(calculateDuration([block('a', 300), block('b', 600)])).toBe(900)
  })

  it('calculates IntervalsT duration as repeat * (on + off)', () => {
    const itBlock: IntervalBlock = {
      id: 'i', type: 'IntervalsT', duration: 0,
      repeat: 5, onDuration: 180, offDuration: 180, textEvents: [],
    }
    expect(calculateDuration([itBlock])).toBe(1800) // 5 * (180 + 180)
  })

  it('handles mixed block types', () => {
    const itBlock: IntervalBlock = {
      id: 'i', type: 'IntervalsT', duration: 0,
      repeat: 3, onDuration: 120, offDuration: 60, textEvents: [],
    }
    expect(calculateDuration([block('a', 300), itBlock, block('b', 300)])).toBe(1140)
    // 300 + 3*(120+60) + 300 = 1140
  })
})
```

- [ ] **Step 3: Run tests**
```bash
npm test __tests__/lib/zwo/intervals.test.ts
# Expected: 10 tests passed
```

- [ ] **Step 4: Commit**
```bash
git add lib/zwo/intervals.ts __tests__/lib/zwo/intervals.test.ts
git commit -m "feat: add pure interval data utilities with full test coverage"
```

---

### Task 12: Build Create Mode — IntervalGraph

**Files:**
- Create: `components/create/IntervalGraph.tsx`

- [ ] **Step 1: Write components/create/IntervalGraph.tsx**
```tsx
// components/create/IntervalGraph.tsx
'use client'
import type { IntervalBlock } from '@/lib/types'

// Zone colours: Z1 grey, Z2 blue, Z3 green, Z4 yellow/sweet-spot, Z5 orange, Z6+ red
function zoneColor(power: number): string {
  if (power < 0.56) return '#6b7280'  // Z1 grey
  if (power < 0.76) return '#60a5fa'  // Z2 blue
  if (power < 0.88) return '#34d399'  // Z3 green
  if (power < 1.05) return '#fbbf24'  // Z4 yellow (sweet spot)
  if (power < 1.20) return '#f97316'  // Z5 orange
  return '#ef4444'                     // Z6+ red
}

interface BlockRect {
  block: IntervalBlock
  x: number      // 0-100 percentage
  width: number  // 0-100 percentage
  // For IntervalsT, we expand into sub-rects
  subRects?: { x: number; width: number; power: number; isOn: boolean }[]
}

function layoutBlocks(blocks: IntervalBlock[]): BlockRect[] {
  const total = blocks.reduce((sum, b) => {
    if (b.type === 'IntervalsT') {
      return sum + (b.repeat ?? 1) * ((b.onDuration ?? 0) + (b.offDuration ?? 0))
    }
    return sum + b.duration
  }, 0)
  if (total === 0) return []

  let cursor = 0
  return blocks.map((block) => {
    let blockDuration: number

    if (block.type === 'IntervalsT') {
      blockDuration = (block.repeat ?? 1) * ((block.onDuration ?? 0) + (block.offDuration ?? 0))
    } else {
      blockDuration = block.duration
    }

    const x = (cursor / total) * 100
    const width = (blockDuration / total) * 100

    let subRects: BlockRect['subRects']
    if (block.type === 'IntervalsT') {
      subRects = []
      const onDur = block.onDuration ?? 60
      const offDur = block.offDuration ?? 60
      const onP = block.onPower ?? 1.1
      const offP = block.offPower ?? 0.5
      const repeat = block.repeat ?? 1
      let subCursor = cursor

      for (let i = 0; i < repeat; i++) {
        const onX = (subCursor / total) * 100
        const onW = (onDur / total) * 100
        subRects.push({ x: onX, width: onW, power: onP, isOn: true })
        subCursor += onDur

        const offX = (subCursor / total) * 100
        const offW = (offDur / total) * 100
        subRects.push({ x: offX, width: offW, power: offP, isOn: false })
        subCursor += offDur
      }
    }

    cursor += blockDuration

    return { block, x, width, subRects }
  })
}

function blockPower(block: IntervalBlock): number {
  if (block.power) return block.power
  if (block.powerHigh) return (block.powerHigh + (block.powerLow ?? block.powerHigh)) / 2
  return 0.6
}

function powerToHeight(power: number): number {
  // Scale: 0 FTP = 0px, 1.5 FTP = 60px (full height)
  return Math.min(60, Math.max(4, (power / 1.5) * 60))
}

interface IntervalGraphProps {
  blocks: IntervalBlock[]
  selectedBlockId?: string | null
  onSelectBlock?: (id: string) => void
}

export function IntervalGraph({ blocks, selectedBlockId, onSelectBlock }: IntervalGraphProps) {
  const rects = layoutBlocks(blocks)

  return (
    <div className="w-full bg-zinc-900 rounded-xl border border-zinc-700 p-3">
      {blocks.length === 0 ? (
        <div className="h-16 flex items-center justify-center text-zinc-600 text-sm">
          Add blocks to see the workout graph
        </div>
      ) : (
        <svg
          viewBox="0 0 100 65"
          className="w-full"
          style={{ height: '72px' }}
          preserveAspectRatio="none"
        >
          {/* Power zone reference lines */}
          {[0.56, 0.76, 0.88, 1.05, 1.20].map((p) => {
            const y = 60 - powerToHeight(p)
            return (
              <line
                key={p}
                x1="0" y1={y} x2="100" y2={y}
                stroke="#3f3f46"
                strokeWidth="0.3"
                strokeDasharray="1,1"
              />
            )
          })}

          {rects.map((r) => {
            const isSelected = r.block.id === selectedBlockId

            if (r.subRects && r.subRects.length > 0) {
              return r.subRects.map((sr, i) => {
                const h = powerToHeight(sr.power)
                const y = 60 - h
                return (
                  <rect
                    key={`${r.block.id}-sub-${i}`}
                    x={sr.x.toFixed(2)}
                    y={y.toFixed(2)}
                    width={Math.max(0.3, sr.width - 0.2).toFixed(2)}
                    height={h.toFixed(2)}
                    fill={zoneColor(sr.power)}
                    opacity={isSelected ? 1 : 0.85}
                    rx="0.3"
                    className="cursor-pointer"
                    onClick={() => onSelectBlock?.(r.block.id)}
                    style={isSelected ? { filter: 'drop-shadow(0 0 2px rgba(99,102,241,0.8))' } : undefined}
                  />
                )
              })
            }

            const power = blockPower(r.block)
            const h = powerToHeight(power)
            const y = 60 - h

            // For ramps, render as a trapezoid using polygon
            if (r.block.type === 'Warmup' || r.block.type === 'Cooldown' || r.block.type === 'Ramp') {
              const lowPower = r.block.powerLow ?? 0.45
              const highPower = r.block.powerHigh ?? 0.75
              const isWarmup = r.block.type === 'Warmup' || r.block.type === 'Ramp'
              const startPower = isWarmup ? lowPower : highPower
              const endPower = isWarmup ? highPower : lowPower
              const startH = powerToHeight(startPower)
              const endH = powerToHeight(endPower)
              const x1 = r.x.toFixed(2)
              const x2 = (r.x + r.width).toFixed(2)
              const points = [
                `${x1},60`,
                `${x1},${(60 - startH).toFixed(2)}`,
                `${x2},${(60 - endH).toFixed(2)}`,
                `${x2},60`,
              ].join(' ')

              return (
                <polygon
                  key={r.block.id}
                  points={points}
                  fill={zoneColor((startPower + endPower) / 2)}
                  opacity={isSelected ? 1 : 0.85}
                  className="cursor-pointer"
                  onClick={() => onSelectBlock?.(r.block.id)}
                  style={isSelected ? { filter: 'drop-shadow(0 0 2px rgba(99,102,241,0.8))' } : undefined}
                />
              )
            }

            return (
              <rect
                key={r.block.id}
                x={r.x.toFixed(2)}
                y={y.toFixed(2)}
                width={Math.max(0.3, r.width - 0.2).toFixed(2)}
                height={h.toFixed(2)}
                fill={zoneColor(power)}
                opacity={isSelected ? 1 : 0.85}
                rx="0.3"
                className="cursor-pointer"
                onClick={() => onSelectBlock?.(r.block.id)}
                style={isSelected ? { filter: 'drop-shadow(0 0 2px rgba(99,102,241,0.8))' } : undefined}
              />
            )
          })}

          {/* Selection indicator: thin line under selected block */}
          {rects
            .filter((r) => r.block.id === selectedBlockId)
            .map((r) => (
              <rect
                key={`sel-${r.block.id}`}
                x={r.x.toFixed(2)}
                y="62"
                width={r.width.toFixed(2)}
                height="2"
                fill="#6366f1"
                rx="1"
              />
            ))}
        </svg>
      )}

      {/* Zone legend */}
      <div className="flex gap-3 mt-2 flex-wrap">
        {[
          { label: 'Z1', color: '#6b7280' },
          { label: 'Z2', color: '#60a5fa' },
          { label: 'Z3', color: '#34d399' },
          { label: 'SS', color: '#fbbf24' },
          { label: 'Z5', color: '#f97316' },
          { label: 'Z6+', color: '#ef4444' },
        ].map((z) => (
          <span key={z.label} className="flex items-center gap-1 text-[10px] text-zinc-500">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ background: z.color }} />
            {z.label}
          </span>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add components/create/IntervalGraph.tsx
git commit -m "feat: add IntervalGraph SVG component with zone colouring and ramp rendering"
```

---

### Task 13: Build Create Mode — BlockPalette and BlockEditor

**Files:**
- Create: `components/create/BlockPalette.tsx`
- Create: `components/create/BlockEditor.tsx`

- [ ] **Step 1: Write components/create/BlockPalette.tsx**
```tsx
// components/create/BlockPalette.tsx
'use client'
import { v4 as uuidv4 } from 'uuid'
import type { IntervalBlock, BlockType } from '@/lib/types'

interface PaletteBlock {
  type: BlockType
  label: string
  description: string
  defaults: Partial<IntervalBlock>
}

const PALETTE: PaletteBlock[] = [
  {
    type: 'Warmup',
    label: 'Warmup',
    description: '10 min Z2→Z3',
    defaults: { duration: 600, powerLow: 0.45, powerHigh: 0.75 },
  },
  {
    type: 'SteadyState',
    label: 'Steady State',
    description: '10 min at 88%',
    defaults: { duration: 600, power: 0.88 },
  },
  {
    type: 'IntervalsT',
    label: 'Intervals',
    description: '5×3min at 110%',
    defaults: { repeat: 5, onDuration: 180, offDuration: 180, onPower: 1.10, offPower: 0.50, duration: 1800 },
  },
  {
    type: 'Ramp',
    label: 'Ramp',
    description: '20 min 60→100%',
    defaults: { duration: 1200, powerLow: 0.60, powerHigh: 1.00 },
  },
  {
    type: 'Cooldown',
    label: 'Cooldown',
    description: '5 min Z1',
    defaults: { duration: 300, powerHigh: 0.60, powerLow: 0.35 },
  },
]

interface BlockPaletteProps {
  onAddBlock: (block: IntervalBlock) => void
}

export function BlockPalette({ onAddBlock }: BlockPaletteProps) {
  function handleAdd(template: PaletteBlock) {
    const block: IntervalBlock = {
      id: uuidv4(),
      type: template.type,
      duration: template.defaults.duration ?? 300,
      textEvents: [],
      ...template.defaults,
    }
    onAddBlock(block)
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Add Block</p>
      {PALETTE.map((template) => (
        <button
          key={template.type}
          onClick={() => handleAdd(template)}
          className="flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 rounded-lg px-3 py-2.5 text-left transition-colors"
        >
          <div>
            <p className="text-sm font-medium text-white">{template.label}</p>
            <p className="text-xs text-zinc-500">{template.description}</p>
          </div>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Write components/create/BlockEditor.tsx**
```tsx
// components/create/BlockEditor.tsx
'use client'
import type { IntervalBlock } from '@/lib/types'

interface BlockEditorProps {
  block: IntervalBlock
  onChange: (changes: Partial<IntervalBlock>) => void
  onDelete: () => void
}

function NumField({
  label, value, onChange, min, max, step = 1, suffix
}: {
  label: string
  value: number | undefined
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-zinc-400">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          min={min}
          max={max}
          step={step}
          className="bg-zinc-800 border border-zinc-700 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-sm outline-none w-full"
        />
        {suffix && <span className="text-xs text-zinc-500 flex-shrink-0">{suffix}</span>}
      </div>
    </div>
  )
}

export function BlockEditor({ block, onChange, onDelete }: BlockEditorProps) {
  const durationMin = Math.round((block.duration ?? 0) / 60)

  function setDurationMin(m: number) {
    onChange({ duration: Math.round(m * 60) })
  }

  function setPowerPercent(field: 'power' | 'powerLow' | 'powerHigh' | 'onPower' | 'offPower', pct: number) {
    onChange({ [field]: pct / 100 })
  }

  function getPowerPct(field: 'power' | 'powerLow' | 'powerHigh' | 'onPower' | 'offPower') {
    const val = block[field]
    return val !== undefined ? Math.round(val * 100) : undefined
  }

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{block.type} Block</h3>
        <button
          onClick={onDelete}
          className="text-zinc-500 hover:text-red-400 text-xs transition-colors"
        >
          Remove
        </button>
      </div>

      {/* Common: duration */}
      {block.type !== 'IntervalsT' && (
        <NumField
          label="Duration"
          value={durationMin}
          onChange={setDurationMin}
          min={1} max={300} step={1}
          suffix="min"
        />
      )}

      {/* Warmup / Cooldown / Ramp */}
      {(block.type === 'Warmup' || block.type === 'Cooldown' || block.type === 'Ramp') && (
        <div className="grid grid-cols-2 gap-3">
          <NumField
            label={block.type === 'Cooldown' ? 'Start power' : 'Low power'}
            value={getPowerPct('powerLow')}
            onChange={(v) => setPowerPercent('powerLow', v)}
            min={20} max={150} step={1}
            suffix="% FTP"
          />
          <NumField
            label={block.type === 'Cooldown' ? 'End power' : 'High power'}
            value={getPowerPct('powerHigh')}
            onChange={(v) => setPowerPercent('powerHigh', v)}
            min={20} max={150} step={1}
            suffix="% FTP"
          />
        </div>
      )}

      {/* SteadyState */}
      {block.type === 'SteadyState' && (
        <NumField
          label="Power"
          value={getPowerPct('power')}
          onChange={(v) => setPowerPercent('power', v)}
          min={20} max={150} step={1}
          suffix="% FTP"
        />
      )}

      {/* IntervalsT */}
      {block.type === 'IntervalsT' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Repeats" value={block.repeat} onChange={(v) => onChange({ repeat: v })} min={1} max={30} />
            <NumField label="Cadence" value={block.cadence} onChange={(v) => onChange({ cadence: v })} min={60} max={120} suffix="rpm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumField
              label="On duration"
              value={block.onDuration !== undefined ? Math.round(block.onDuration / 60) : undefined}
              onChange={(v) => onChange({ onDuration: Math.round(v * 60) })}
              min={0.5} step={0.5}
              suffix="min"
            />
            <NumField
              label="Off duration"
              value={block.offDuration !== undefined ? Math.round(block.offDuration / 60) : undefined}
              onChange={(v) => onChange({ offDuration: Math.round(v * 60) })}
              min={0.5} step={0.5}
              suffix="min"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumField
              label="On power"
              value={getPowerPct('onPower')}
              onChange={(v) => setPowerPercent('onPower', v)}
              min={50} max={200} step={1}
              suffix="% FTP"
            />
            <NumField
              label="Off power"
              value={getPowerPct('offPower')}
              onChange={(v) => setPowerPercent('offPower', v)}
              min={20} max={100} step={1}
              suffix="% FTP"
            />
          </div>
        </>
      )}

      {/* Cadence (for non-IntervalsT) */}
      {block.type !== 'IntervalsT' && (
        <NumField
          label="Cadence (optional)"
          value={block.cadence}
          onChange={(v) => onChange({ cadence: v })}
          min={60} max={120}
          suffix="rpm"
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**
```bash
git add components/create/BlockPalette.tsx components/create/BlockEditor.tsx
git commit -m "feat: add BlockPalette and BlockEditor for Create mode"
```

---

### Task 14: Build Create Mode — TextEventEditor

**Files:**
- Create: `components/create/TextEventEditor.tsx`

- [ ] **Step 1: Write components/create/TextEventEditor.tsx**
```tsx
// components/create/TextEventEditor.tsx
'use client'
import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { TextEvent, TextEventCategory, IntervalBlock, Workout } from '@/lib/types'

const CATEGORY_COLORS: Record<TextEventCategory, string> = {
  physiology: 'bg-blue-700',
  motivation: 'bg-indigo-600',
  technique:  'bg-teal-700',
  pacing:     'bg-yellow-700',
  recovery:   'bg-green-800',
  nutrition:  'bg-orange-700',
}

const CATEGORIES: TextEventCategory[] = ['physiology', 'motivation', 'technique', 'pacing', 'recovery', 'nutrition']

interface TextEventEditorProps {
  block: IntervalBlock
  workout: Workout
  onChange: (updatedEvents: TextEvent[]) => void
}

interface InlineForm {
  id?: string   // if editing existing
  timeOffset: number
  message: string
  category: TextEventCategory
  duration: number
}

const EMPTY_FORM: InlineForm = {
  timeOffset: 0,
  message: '',
  category: 'physiology',
  duration: 10,
}

export function TextEventEditor({ block, workout, onChange }: TextEventEditorProps) {
  const [form, setForm] = useState<InlineForm | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const events = block.textEvents ?? []

  function openAdd() {
    setForm({ ...EMPTY_FORM })
    setError(null)
  }

  function openEdit(te: TextEvent) {
    setForm({
      id: te.id,
      timeOffset: te.timeOffset,
      message: te.message,
      category: te.category,
      duration: te.duration,
    })
    setError(null)
  }

  function cancelForm() {
    setForm(null)
    setError(null)
  }

  function saveForm() {
    if (!form) return
    if (!form.message.trim()) {
      setError('Message is required')
      return
    }

    const newEvent: TextEvent = {
      id: form.id ?? uuidv4(),
      message: form.message.trim(),
      timeOffset: form.timeOffset,
      duration: form.duration,
      category: form.category,
    }

    if (form.id) {
      onChange(events.map((e) => (e.id === form.id ? newEvent : e)))
    } else {
      const sorted = [...events, newEvent].sort((a, b) => a.timeOffset - b.timeOffset)
      onChange(sorted)
    }
    setForm(null)
    setError(null)
  }

  function deleteEvent(id: string) {
    onChange(events.filter((e) => e.id !== id))
  }

  async function generateWithAI() {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/generate-textevents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workout }),
      })
      if (!res.ok) throw new Error('Generation failed')
      const data: { textEventsByBlock: TextEvent[][] } = await res.json()

      const blockIndex = workout.blocks.findIndex((b) => b.id === block.id)
      const generated = data.textEventsByBlock[blockIndex] ?? []
      const withIds = generated.map((te) => ({ ...te, id: te.id || uuidv4() }))
      onChange(withIds)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate textevents')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Text Events</h3>
        <div className="flex gap-2">
          <button
            onClick={generateWithAI}
            disabled={generating}
            className="text-xs bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            {generating ? 'Generating...' : 'Generate with AI'}
          </button>
          <button
            onClick={openAdd}
            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            + Add
          </button>
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-xs">{error}</p>
      )}

      {events.length === 0 && !form && (
        <p className="text-zinc-600 text-xs text-center py-4">
          No text events. Add one manually or use AI generation.
        </p>
      )}

      {/* Event list */}
      <div className="flex flex-col gap-1.5">
        {events.map((te) => (
          <div
            key={te.id}
            className="flex items-start gap-2 bg-zinc-800 rounded-lg px-3 py-2"
          >
            <span className="text-[10px] text-zinc-500 mt-0.5 w-8 flex-shrink-0">{te.timeOffset}s</span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${CATEGORY_COLORS[te.category]} text-white`}>
              {te.category}
            </span>
            <p className="text-xs text-zinc-300 flex-1 leading-snug line-clamp-2">{te.message}</p>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => openEdit(te)} className="text-[10px] text-zinc-500 hover:text-white">Edit</button>
              <button onClick={() => deleteEvent(te.id)} className="text-[10px] text-zinc-500 hover:text-red-400">Del</button>
            </div>
          </div>
        ))}
      </div>

      {/* Inline form */}
      {form && (
        <div className="bg-zinc-700 border border-zinc-600 rounded-xl p-4 flex flex-col gap-3">
          <h4 className="text-sm font-medium">{form.id ? 'Edit' : 'New'} Text Event</h4>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-400">Message</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm((f) => f && { ...f, message: e.target.value })}
              rows={2}
              className="bg-zinc-800 border border-zinc-600 focus:border-indigo-500 rounded-lg px-2.5 py-2 text-sm outline-none resize-none"
              placeholder="What should the rider see?"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-400">Time offset (s)</label>
              <input
                type="number"
                value={form.timeOffset}
                onChange={(e) => setForm((f) => f && { ...f, timeOffset: parseInt(e.target.value) || 0 })}
                min={0}
                max={block.duration}
                className="bg-zinc-800 border border-zinc-600 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-sm outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-400">Display duration (s)</label>
              <input
                type="number"
                value={form.duration}
                onChange={(e) => setForm((f) => f && { ...f, duration: parseInt(e.target.value) || 10 })}
                min={3} max={60}
                className="bg-zinc-800 border border-zinc-600 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-sm outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-400">Category</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setForm((f) => f && { ...f, category: cat })}
                  className={`text-[10px] font-medium px-2 py-1 rounded transition-colors ${
                    form.category === cat ? `${CATEGORY_COLORS[cat]} text-white` : 'bg-zinc-700 text-zinc-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-2">
            <button onClick={cancelForm} className="flex-1 bg-zinc-600 hover:bg-zinc-500 text-white text-sm py-2 rounded-lg">Cancel</button>
            <button onClick={saveForm} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm py-2 rounded-lg">Save</button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add components/create/TextEventEditor.tsx
git commit -m "feat: add TextEventEditor with manual add/edit/delete and AI generation"
```

---

### Task 15: Build Create Mode — IntervalBuilder Composer

**Files:**
- Create: `components/create/IntervalBuilder.tsx`
- Create: `app/create/page.tsx`

- [ ] **Step 1: Write components/create/IntervalBuilder.tsx**
```tsx
// components/create/IntervalBuilder.tsx
'use client'
import { useState, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { v4 as uuidv4 } from 'uuid'
import type { Workout, IntervalBlock } from '@/lib/types'
import { IntervalGraph } from './IntervalGraph'
import { BlockPalette } from './BlockPalette'
import { BlockEditor } from './BlockEditor'
import { TextEventEditor } from './TextEventEditor'
import { addBlock, removeBlock, reorderBlocks, updateBlock, calculateDuration } from '@/lib/zwo/intervals'

const EMPTY_WORKOUT: Workout = {
  name: 'My Workout',
  description: '',
  sportType: 'bike',
  durationSeconds: 0,
  blocks: [],
  textEventsEnabled: true,
}

interface IntervalBuilderProps {
  initialWorkout?: Workout
}

export function IntervalBuilder({ initialWorkout }: IntervalBuilderProps) {
  const [workout, setWorkout] = useState<Workout>(initialWorkout ?? EMPTY_WORKOUT)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [aiPromptOpen, setAiPromptOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const selectedBlock = workout.blocks.find((b) => b.id === selectedBlockId) ?? null

  const handleAddBlock = useCallback((block: IntervalBlock) => {
    setWorkout((w) => addBlock(w, block))
    setSelectedBlockId(block.id)
  }, [])

  const handleRemoveBlock = useCallback((id: string) => {
    setWorkout((w) => removeBlock(w, id))
    setSelectedBlockId(null)
  }, [])

  const handleBlockChange = useCallback((changes: Partial<IntervalBlock>) => {
    if (!selectedBlockId) return
    setWorkout((w) => updateBlock(w, selectedBlockId, changes))
  }, [selectedBlockId])

  const handleTextEventsChange = useCallback((updatedEvents: TextEvent[]) => {
    if (!selectedBlockId) return
    setWorkout((w) => updateBlock(w, selectedBlockId, { textEvents: updatedEvents }))
  }, [selectedBlockId])

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return
    setWorkout((w) => reorderBlocks(w, result.source.index, result.destination!.index))
  }

  async function handleAIGenerate() {
    if (!aiPrompt.trim()) return
    setAiLoading(true)
    try {
      // Fetch athlete data and profile to send with the request
      const [athleteRes, profileRes] = await Promise.all([
        fetch('/api/intervals/athlete'),
        fetch('/api/profile'),
      ])
      const athleteData = await athleteRes.json()
      const profile = await profileRes.json()

      const res = await fetch('/api/ai/generate-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, athleteData, profile }),
      })
      if (!res.ok) throw new Error('AI generation failed')
      const generated: Workout = await res.json()
      // Assign fresh IDs to avoid collisions
      generated.blocks = generated.blocks.map((b) => ({ ...b, id: uuidv4(), textEvents: b.textEvents ?? [] }))
      generated.durationSeconds = calculateDuration(generated.blocks)
      setWorkout(generated)
      setSelectedBlockId(null)
      setAiPromptOpen(false)
      setAiPrompt('')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'AI generation failed')
    } finally {
      setAiLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      const res = await fetch('/api/intervals/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workout),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Save failed')
      }
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const durationMin = Math.round(workout.durationSeconds / 60)

  return (
    <div className="flex flex-col gap-4 px-4 py-6 md:px-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1 flex flex-col gap-2">
          <input
            value={workout.name}
            onChange={(e) => setWorkout((w) => ({ ...w, name: e.target.value }))}
            className="text-xl font-bold bg-transparent border-b border-zinc-700 focus:border-indigo-500 outline-none pb-1"
            placeholder="Workout name"
          />
          <input
            value={workout.description}
            onChange={(e) => setWorkout((w) => ({ ...w, description: e.target.value }))}
            className="text-sm text-zinc-400 bg-transparent border-b border-zinc-800 focus:border-zinc-600 outline-none pb-1"
            placeholder="Description (optional)"
          />
          <p className="text-xs text-zinc-600">{durationMin} min total</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Textevents toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">Text events</span>
            <button
              onClick={() => setWorkout((w) => ({ ...w, textEventsEnabled: !w.textEventsEnabled }))}
              className={`w-9 h-5 rounded-full transition-colors ${
                workout.textEventsEnabled ? 'bg-indigo-600' : 'bg-zinc-700'
              } relative`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  workout.textEventsEnabled ? 'translate-x-4' : ''
                }`}
              />
            </button>
          </div>
          <button
            onClick={() => setAiPromptOpen(true)}
            className="text-sm bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            Start from AI
          </button>
          <button
            onClick={handleSave}
            disabled={saving || workout.blocks.length === 0}
            className="text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg transition-colors font-medium"
          >
            {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save to Library'}
          </button>
        </div>
      </div>

      {saveError && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-2 text-red-400 text-sm">
          {saveError}
        </div>
      )}

      {/* AI Prompt modal */}
      {aiPromptOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-semibold mb-2">Generate workout with AI</h3>
            <p className="text-zinc-400 text-sm mb-4">
              Describe what you want. Your fitness data will be included automatically.
            </p>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm outline-none resize-none mb-4"
              placeholder="e.g. 45-min sweet spot session with a hard finish"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setAiPromptOpen(false); setAiPrompt('') }}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAIGenerate}
                disabled={aiLoading || !aiPrompt.trim()}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium"
              >
                {aiLoading ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Graph */}
      <IntervalGraph
        blocks={workout.blocks}
        selectedBlockId={selectedBlockId}
        onSelectBlock={setSelectedBlockId}
      />

      {/* Main editor area */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left: block list + palette */}
        <div className="flex flex-col gap-4 lg:w-64 flex-shrink-0">
          <BlockPalette onAddBlock={handleAddBlock} />

          {workout.blocks.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Blocks</p>
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="blocks">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="flex flex-col gap-1">
                      {workout.blocks.map((block, index) => (
                        <Draggable key={block.id} draggableId={block.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => setSelectedBlockId(block.id)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                                block.id === selectedBlockId
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
                              } ${snapshot.isDragging ? 'shadow-lg ring-1 ring-indigo-500' : ''}`}
                            >
                              <span className="text-zinc-600 text-xs">⠿</span>
                              <span className="flex-1 truncate">{block.type}</span>
                              <span className="text-xs opacity-60">{Math.round(block.duration / 60)}m</span>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          )}
        </div>

        {/* Right: editor panels */}
        {selectedBlock ? (
          <div className="flex-1 flex flex-col gap-4">
            <BlockEditor
              block={selectedBlock}
              onChange={handleBlockChange}
              onDelete={() => handleRemoveBlock(selectedBlock.id)}
            />
            {workout.textEventsEnabled && (
              <TextEventEditor
                block={selectedBlock}
                workout={workout}
                onChange={handleTextEventsChange}
              />
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm min-h-[120px]">
            Select a block to edit it, or add blocks from the palette.
          </div>
        )}
      </div>
    </div>
  )
}

// Fix missing import
import type { TextEvent } from '@/lib/types'
```

- [ ] **Step 2: Write app/create/page.tsx**
```tsx
// app/create/page.tsx
'use client'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import type { Workout } from '@/lib/types'
import { IntervalBuilder } from '@/components/create/IntervalBuilder'

function CreatePageInner() {
  const searchParams = useSearchParams()
  const workoutId = searchParams.get('workoutId')
  const [initialWorkout, setInitialWorkout] = useState<Workout | undefined>(undefined)
  const [loading, setLoading] = useState(!!workoutId)

  useEffect(() => {
    // Check localStorage for AI-generated workout passed from Coach
    const fromCoach = localStorage.getItem('coach:pendingWorkout')
    if (fromCoach) {
      try {
        const w: Workout = JSON.parse(fromCoach)
        setInitialWorkout(w)
        localStorage.removeItem('coach:pendingWorkout')
        setLoading(false)
        return
      } catch {
        // ignore
      }
    }

    if (workoutId) {
      // TODO: fetch workout detail from intervals.icu by id
      // For now, library page navigates with workoutId but full block data
      // requires a separate endpoint that isn't in the intervals.icu free tier.
      // Fall through to empty builder.
      setLoading(false)
    }
  }, [workoutId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <div className="text-zinc-500 text-sm">Loading workout...</div>
      </div>
    )
  }

  return <IntervalBuilder initialWorkout={initialWorkout} />
}

export default function CreatePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full min-h-[50vh]"><div className="text-zinc-500 text-sm">Loading...</div></div>}>
      <CreatePageInner />
    </Suspense>
  )
}
```

- [ ] **Step 3: Commit**
```bash
git add components/create/IntervalBuilder.tsx app/create/page.tsx
git commit -m "feat: add IntervalBuilder composer with DnD reordering, AI generation, and save"
```

---

### Task 16: Build Coach Mode — Chat UI

**Files:**
- Create: `components/coach/ChatInterface.tsx`
- Create: `components/coach/ChatMessage.tsx`
- Create: `components/coach/QuickStartSuggestions.tsx`
- Modify: `app/coach/page.tsx`

- [ ] **Step 1: Write components/coach/ChatMessage.tsx**
```tsx
// components/coach/ChatMessage.tsx
'use client'
import type { ChatMessage as ChatMessageType, Workout, TrainingPlan } from '@/lib/types'
import { GeneratedWorkoutCard } from './GeneratedWorkoutCard'

// Attempt to extract structured output from assistant messages
function extractStructured(content: string): { type: 'workout'; data: Workout } | { type: 'plan'; data: TrainingPlan } | null {
  const match = content.match(/\{["']type["']\s*:\s*["'](workout|plan)["'].*?\}/s)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[0])
    if (parsed.type === 'workout' && parsed.data) return { type: 'workout', data: parsed.data }
    if (parsed.type === 'plan' && parsed.data) return { type: 'plan', data: parsed.data }
  } catch { /* ignore */ }
  return null
}

// Remove the JSON blob from display text
function cleanContent(content: string): string {
  return content.replace(/\{["']type["']\s*:\s*["'](workout|plan)["'][\s\S]*?\}\s*/g, '').trim()
}

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessageBubble({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const structured = !isUser ? extractStructured(message.content) : null
  const displayText = structured ? cleanContent(message.content) : message.content

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2 mb-4`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1">
          C
        </div>
      )}
      <div className={`max-w-[85%] ${isUser ? 'max-w-[75%]' : ''}`}>
        {displayText && (
          <div
            className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              isUser
                ? 'bg-indigo-600 text-white rounded-tr-sm'
                : 'bg-zinc-800 text-zinc-100 rounded-tl-sm'
            }`}
          >
            {displayText.split('\n').map((line, i) => (
              <p key={i} className={i > 0 ? 'mt-1' : ''}>{line}</p>
            ))}
          </div>
        )}

        {structured?.type === 'workout' && (
          <div className="mt-2">
            <GeneratedWorkoutCard workout={structured.data} />
          </div>
        )}

        {structured?.type === 'plan' && (
          <div className="mt-2 bg-zinc-800 border border-zinc-700 rounded-xl p-4">
            <p className="font-medium text-sm">{structured.data.name}</p>
            <p className="text-zinc-400 text-xs mt-1">{structured.data.weeks.length} weeks starting {structured.data.startDate}</p>
            <p className="text-xs text-zinc-500 mt-1">{structured.data.description}</p>
            <button
              onClick={() => {
                localStorage.setItem('plan:draft', JSON.stringify(structured.data))
                window.location.href = '/plan'
              }}
              className="mt-3 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg"
            >
              Open in Plan
            </button>
          </div>
        )}

        <p className={`text-[10px] text-zinc-600 mt-1 ${isUser ? 'text-right' : ''}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write components/coach/QuickStartSuggestions.tsx**
```tsx
// components/coach/QuickStartSuggestions.tsx
'use client'

const SUGGESTIONS = [
  'Plan my next week of training',
  'Give me a 45-min sweet spot session',
  "I'm feeling flat — what should I do?",
  'Update my training profile',
]

interface QuickStartSuggestionsProps {
  onSelect: (text: string) => void
}

export function QuickStartSuggestions({ onSelect }: QuickStartSuggestionsProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-center">
        <h2 className="text-lg font-semibold">How can I help you train today?</h2>
        <p className="text-zinc-500 text-sm mt-1">Your fitness data is already loaded.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSelect(s)}
            className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 rounded-xl px-4 py-3 text-left text-sm text-zinc-300 hover:text-white transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write components/coach/ChatInterface.tsx**
```tsx
// components/coach/ChatInterface.tsx
'use client'
import { useState, useRef, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { ChatMessage, AthleteData, CoachingProfile } from '@/lib/types'
import { ChatMessageBubble } from './ChatMessage'
import { QuickStartSuggestions } from './QuickStartSuggestions'

function buildSystemPrompt(athleteData: AthleteData, profile: CoachingProfile): string {
  const activitySummary = athleteData.recentActivities
    .slice(0, 10)
    .map(
      (a) =>
        `  - ${a.date}: ${a.type} ${Math.round(a.durationSeconds / 60)}min TSS:${a.tss}${a.averageHR ? ` HR:${a.averageHR}` : ''}`
    )
    .join('\n')

  const availableDays = profile.availableDays
    .filter((d) => d.available)
    .map((d) => `${d.day} (max ${d.maxSessionMinutes}min)`)
    .join(', ')

  return `You are a personal cycling coach with access to the athlete's real-time training data.

ATHLETE:
- FTP: ${athleteData.ftp}W | Weight: ${athleteData.weight}kg
- CTL: ${athleteData.ctl} (fitness) | ATL: ${athleteData.atl} (fatigue) | TSB: ${athleteData.tsb} (form)
- Last 14 days:
${activitySummary || '  No recent activities'}

COACHING PROFILE:
- Goals: ${profile.goals.join(', ') || 'Not specified'}
- Constraints: ${profile.constraints.join(', ') || 'None'}
- Available: ${availableDays || 'Not specified'}
- Preferences: ${profile.preferences.join(', ') || 'None'}
- Target events: ${profile.targetEvents.join(', ') || 'None'}

RULES:
- Prefer short structured sessions (45-60 min) over long Zone 2
- Sweet spot and VO2 max are primary zones
- Always explain the science when giving training advice
- To output a workout, wrap it: {"type":"workout","data":{...WorkoutJSON}}
- To output a plan, wrap it: {"type":"plan","data":{...PlanJSON}}
- Keep responses concise — the athlete is probably time-poor`
}

interface ChatInterfaceProps {
  athleteData: AthleteData
  profile: CoachingProfile
  onProfileUpdateRequest?: () => void
}

export function ChatInterface({ athleteData, profile, onProfileUpdateRequest }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text: string) {
    if (!text.trim() || sending) return

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setSending(true)

    try {
      const systemPrompt = buildSystemPrompt(athleteData, profile)
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, systemPrompt }),
      })

      if (!res.ok) throw new Error('Chat request failed')
      const data: { content: string } = await res.json()

      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date().toISOString(),
      }
      setMessages([...newMessages, assistantMessage])
    } catch {
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date().toISOString(),
      }
      setMessages([...newMessages, errorMessage])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Message area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
        {messages.length === 0 ? (
          <QuickStartSuggestions onSelect={sendMessage} />
        ) : (
          <div className="max-w-2xl mx-auto">
            {messages.map((m) => (
              <ChatMessageBubble key={m.id} message={m} />
            ))}
            {sending && (
              <div className="flex gap-2 mb-4">
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0">C</div>
                <div className="bg-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1 items-center h-5">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-zinc-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage(input)
              }
            }}
            placeholder="Ask your coach..."
            disabled={sending}
            className="flex-1 bg-zinc-800 border border-zinc-700 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm outline-none disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={sending || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 rounded-xl text-sm font-medium transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Update app/coach/page.tsx with full chat UI**
```tsx
// app/coach/page.tsx
'use client'
import { useState, useEffect } from 'react'
import type { CoachingProfile, AthleteData } from '@/lib/types'
import { OnboardingForm } from '@/components/coach/OnboardingForm'
import { ChatInterface } from '@/components/coach/ChatInterface'

type LoadState = 'loading' | 'onboarding' | 'ready' | 'error'

export default function CoachPage() {
  const [state, setState] = useState<LoadState>('loading')
  const [profile, setProfile] = useState<CoachingProfile | null>(null)
  const [athleteData, setAthleteData] = useState<AthleteData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/profile').then((r) => r.json()),
      fetch('/api/intervals/athlete').then((r) => r.json()),
    ])
      .then(([prof, athlete]) => {
        setAthleteData(athlete)
        if (!prof || !prof.availableDays) {
          setState('onboarding')
        } else {
          setProfile(prof)
          setState('ready')
        }
      })
      .catch((err) => {
        setError(err.message ?? 'Failed to load data')
        setState('error')
      })
  }, [])

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-zinc-500 text-sm">Loading your fitness data...</div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-2">{error}</p>
          <p className="text-zinc-500 text-xs">Check that your INTERVALS_API_KEY and INTERVALS_ATHLETE_ID are set in .env.local</p>
        </div>
      </div>
    )
  }

  if (state === 'onboarding') {
    return (
      <OnboardingForm
        onComplete={(p) => {
          setProfile(p)
          setState('ready')
        }}
      />
    )
  }

  if (!profile || !athleteData) return null

  return (
    <div className="flex flex-col h-screen md:h-[calc(100vh)] overflow-hidden">
      {/* Athlete summary bar */}
      <div className="border-b border-zinc-800 px-4 py-2 flex gap-4 text-xs text-zinc-500 flex-wrap">
        <span>FTP: <span className="text-zinc-300 font-medium">{athleteData.ftp}W</span></span>
        <span>CTL: <span className="text-zinc-300 font-medium">{athleteData.ctl}</span></span>
        <span>ATL: <span className="text-zinc-300 font-medium">{athleteData.atl}</span></span>
        <span>TSB: <span className={`font-medium ${athleteData.tsb >= 0 ? 'text-green-400' : 'text-orange-400'}`}>{athleteData.tsb > 0 ? '+' : ''}{athleteData.tsb}</span></span>
        <span className="ml-auto text-zinc-600">{athleteData.name}</span>
      </div>
      <ChatInterface athleteData={athleteData} profile={profile} />
    </div>
  )
}
```

- [ ] **Step 5: Commit**
```bash
git add components/coach/ChatInterface.tsx components/coach/ChatMessage.tsx \
  components/coach/QuickStartSuggestions.tsx app/coach/page.tsx
git commit -m "feat: add Coach mode with full chat UI, athlete data bar, and quick-start suggestions"
```

---

### Task 17: Build Coach Mode — Generated Output Cards

**Files:**
- Create: `components/coach/GeneratedWorkoutCard.tsx`

- [ ] **Step 1: Write components/coach/GeneratedWorkoutCard.tsx**
```tsx
// components/coach/GeneratedWorkoutCard.tsx
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

// Count blocks by zone
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
```

- [ ] **Step 2: Commit**
```bash
git add components/coach/GeneratedWorkoutCard.tsx
git commit -m "feat: add GeneratedWorkoutCard with save-to-library and open-in-create actions"
```

---

### Task 18: Build Plan Mode — Block and Weekly Views

**Files:**
- Create: `components/plan/BlockView.tsx`
- Create: `components/plan/WeeklyView.tsx`
- Create: `components/plan/SessionSlot.tsx`
- Create: `app/plan/page.tsx`

- [ ] **Step 1: Write components/plan/SessionSlot.tsx**
```tsx
// components/plan/SessionSlot.tsx
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
```

- [ ] **Step 2: Write components/plan/WeeklyView.tsx**
```tsx
// components/plan/WeeklyView.tsx
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
```

- [ ] **Step 3: Write components/plan/BlockView.tsx**
```tsx
// components/plan/BlockView.tsx
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
```

- [ ] **Step 4: Write app/plan/page.tsx (initial)**
```tsx
// app/plan/page.tsx
'use client'
import { useState, useEffect } from 'react'
import type { TrainingPlan, PlanWeek, PlanSession } from '@/lib/types'
import { BlockView } from '@/components/plan/BlockView'
import { WeeklyView } from '@/components/plan/WeeklyView'

export default function PlanPage() {
  const [plan, setPlan] = useState<TrainingPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)

  useEffect(() => {
    // Check localStorage for plan passed from Coach
    const fromCoach = localStorage.getItem('plan:draft')
    if (fromCoach) {
      try {
        const p: TrainingPlan = JSON.parse(fromCoach)
        setPlan(p)
        setLoading(false)
        // Also persist to Upstash
        fetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planDraft: p }),
        }).catch(() => {})
        return
      } catch { /* ignore */ }
    }
    setLoading(false)
  }, [])

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
        <div className="text-center">
          <h2 className="font-semibold text-lg mb-2">No training plan yet</h2>
          <p className="text-zinc-400 text-sm max-w-sm">
            Ask your coach to generate a plan, or start from the Coach tab.
          </p>
        </div>
        <button
          onClick={() => window.location.href = '/coach'}
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
        {/* Push and adjustment actions added in Task 20 */}
      </div>

      {/* Block view */}
      <BlockView
        weeks={plan.weeks}
        selectedWeek={selectedWeek}
        onSelectWeek={(n) => setSelectedWeek(n === selectedWeek ? null : n)}
      />

      {/* Weekly view */}
      {selectedWeekData && (
        <div className="border-t border-zinc-800 pt-6">
          <WeeklyView
            week={selectedWeekData}
            onSwapSession={(session) => {
              // Library picker modal added in Task 19
              console.log('Swap session:', session.id)
            }}
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Commit**
```bash
git add components/plan/ app/plan/page.tsx
git commit -m "feat: add Plan mode with block view, weekly view, and session slots"
```

---

### Task 19: Build Plan Mode — AI Adjustment and Draft Storage

**Files:**
- Modify: `app/plan/page.tsx`
- Create: `app/api/drafts/route.ts`

- [ ] **Step 1: Create app/api/drafts/route.ts**
```typescript
// app/api/drafts/route.ts
// Dedicated endpoint for plan draft CRUD via Upstash Redis.
import { NextRequest, NextResponse } from 'next/server'
import { getPlanDraft, setPlanDraft, listPlanDrafts, deletePlanDraft } from '@/lib/redis/client'
import type { TrainingPlan } from '@/lib/types'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (id) {
      const plan = await getPlanDraft(id)
      return NextResponse.json(plan)
    }

    const plans = await listPlanDrafts()
    return NextResponse.json(plans)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const plan: TrainingPlan = await req.json()
    if (!plan.id) return NextResponse.json({ error: 'plan.id required' }, { status: 400 })
    await setPlanDraft(plan.id, plan)
    return NextResponse.json(plan, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await deletePlanDraft(id)
    return NextResponse.json({ deleted: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Update app/plan/page.tsx — add AI adjustment chat and library swap modal**

Replace the `app/plan/page.tsx` content with the following full implementation:

```tsx
// app/plan/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { TrainingPlan, PlanSession, Workout } from '@/lib/types'
import { BlockView } from '@/components/plan/BlockView'
import { WeeklyView } from '@/components/plan/WeeklyView'

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
          messages: [{ id: uuidv4(), role: 'user', content: input, timestamp: new Date().toISOString() }],
          systemPrompt,
        }),
      })
      if (!res.ok) throw new Error('Adjustment failed')
      const data: { content: string } = await res.json()

      // Parse the updated plan from the response
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

// ---- Main page ----
export default function PlanPage() {
  const [plan, setPlan] = useState<TrainingPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const [swapSession, setSwapSession] = useState<PlanSession | null>(null)

  useEffect(() => {
    // Check localStorage for plan from Coach mode
    const fromCoach = localStorage.getItem('plan:draft')
    if (fromCoach) {
      try {
        const p: TrainingPlan = JSON.parse(fromCoach)
        setPlan(p)
        localStorage.removeItem('plan:draft')
        setLoading(false)
        // Persist to Upstash
        fetch('/api/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p),
        }).catch(() => {})
        return
      } catch { /* ignore */ }
    }

    // Otherwise load most recent from Upstash
    fetch('/api/drafts')
      .then((r) => r.json())
      .then((drafts: TrainingPlan[]) => {
        if (drafts && drafts.length > 0) {
          // Most recently created
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
    // Persist
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
          onClick={() => window.location.href = '/coach'}
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
        {/* Push button added in Task 20 */}
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
```

- [ ] **Step 3: Commit**
```bash
git add app/plan/page.tsx app/api/drafts/route.ts
git commit -m "feat: add Plan mode AI adjustment chat, library swap modal, and draft persistence"
```

---

### Task 20: Build Plan Mode — Push to intervals.icu + Settings Page

**Files:**
- Modify: `app/plan/page.tsx`
- Create: `components/plan/ConflictModal.tsx`
- Create: `app/settings/page.tsx`

- [ ] **Step 1: Write components/plan/ConflictModal.tsx**
```tsx
// components/plan/ConflictModal.tsx
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
```

- [ ] **Step 2: Update app/plan/page.tsx — add push logic**

Add the following push logic to `app/plan/page.tsx`. Insert the `PushButton` component and wire it into the existing plan page header. The full additions are:

```tsx
// Add at the top of app/plan/page.tsx, after existing imports:
import { ConflictModal, ConflictItem, ConflictChoice } from '@/components/plan/ConflictModal'
import type { CalendarEvent } from '@/lib/intervals/client'

// Add PushButton component inside app/plan/page.tsx (before the default export):
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
      // Collect all sessions with a workout assigned
      const sessions = plan.weeks.flatMap((w) => w.sessions).filter((s) => s.workoutId)

      if (sessions.length === 0) {
        setPushError('No sessions with assigned workouts to push.')
        setChecking(false)
        return
      }

      // Find date range
      const dates = sessions.map((s) => s.date).sort()
      const oldest = dates[0]
      const newest = dates[dates.length - 1]

      // Fetch existing events
      const eventsRes = await fetch(`/api/intervals/events?oldest=${oldest}&newest=${newest}`)
      if (!eventsRes.ok) throw new Error('Failed to fetch existing events')
      const existingEvents: CalendarEvent[] = await eventsRes.json()

      // Find conflicts
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
        // No conflicts — push immediately
        await pushSessions(sessions, [])
      }
    } catch (err) {
      setPushError(err instanceof Error ? err.message : 'Check failed')
    } finally {
      setChecking(false)
    }
  }

  async function pushSessions(
    sessions: { id: string; date: string; workoutId: string | null; workoutName: string | null }[],
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
```

Then in the JSX, replace the `{/* Push button added in Task 20 */}` comment in the plan header with:
```tsx
<PushButton plan={plan} />
```

- [ ] **Step 3: Write app/settings/page.tsx**
```tsx
// app/settings/page.tsx
'use client'
import { useState, useEffect } from 'react'
import type { CoachingProfile, DaySchedule, DayOfWeek } from '@/lib/types'

const ALL_DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function SettingsPage() {
  const [profile, setProfile] = useState<CoachingProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Editable fields
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
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data: CoachingProfile | null) => {
        if (data) {
          setProfile(data)
          setSchedule(
            ALL_DAYS.map((day) => {
              const existing = data.availableDays.find((d) => d.day === day)
              return existing ?? { day, available: false, maxSessionMinutes: 60 }
            })
          )
          setGoals(data.goals)
          setConstraints(data.constraints)
          setPreferences(data.preferences)
          setTargetEvents(data.targetEvents)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

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

  function TagSection({
    label, items, input, onInputChange, onAdd, onRemove, placeholder
  }: {
    label: string
    items: string[]
    input: string
    onInputChange: (v: string) => void
    onAdd: () => void
    onRemove: (v: string) => void
    placeholder: string
  }) {
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

      {/* Available days */}
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
        label="Constraints & Preferences"
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
```

- [ ] **Step 4: Add Settings link to navigation**

Update `components/nav/Sidebar.tsx` and `components/nav/BottomNav.tsx` — add Settings to the nav items:

In `Sidebar.tsx`, update `NAV_ITEMS`:
```tsx
const NAV_ITEMS = [
  { href: '/coach',    label: 'Coach',    icon: '💬' },
  { href: '/plan',     label: 'Plan',     icon: '📅' },
  { href: '/create',   label: 'Create',   icon: '✏️'  },
  { href: '/library',  label: 'Library',  icon: '📚' },
  { href: '/settings', label: 'Settings', icon: '⚙️'  },
]
```

In `BottomNav.tsx`, keep only the 4 primary tabs (Coach, Plan, Create, Library) to avoid cramping the mobile bar — Settings is accessible via the sidebar on desktop or a link from the Coach profile display.

- [ ] **Step 5: Final build check**
```bash
npm run build
# Expected: Build successful
# Check: all pages compile, no TypeScript errors
# Check: all API routes resolve
```

- [ ] **Step 6: Run full test suite**
```bash
npm test
# Expected:
#   PASS  __tests__/types.test.ts
#   PASS  __tests__/lib/intervals/client.test.ts
#   PASS  __tests__/lib/ai/gemini.test.ts
#   PASS  __tests__/lib/redis/client.test.ts
#   PASS  __tests__/lib/zwo/generator.test.ts
#   PASS  __tests__/lib/zwo/intervals.test.ts
#   Tests: ~31 passed, 0 failed
```

- [ ] **Step 7: Commit**
```bash
git add components/plan/ConflictModal.tsx app/plan/page.tsx app/settings/page.tsx \
  components/nav/Sidebar.tsx
git commit -m "feat: add plan push to intervals.icu with conflict resolution and Settings page"
```

---

## Implementation Notes for Agents

### Execution Order
Tasks 1-6 are pure library/infra tasks with no UI dependencies — they can run sequentially but each is self-contained. Tasks 7 onwards build on earlier tasks. Do not skip Tasks 1-6; the types and clients underpin everything.

### Environment Setup
Before running `npm run dev`, create `.env.local` from `.env.local.example` and fill in all four values. The app will fail to load coach data without valid credentials — this is expected and surfaces as the "error" state in CoachPage.

### Key Architectural Decisions (do not change without good reason)
1. **No app-side workout storage.** intervals.icu is the library. Saving a workout = POST to `/api/intervals/workouts`.
2. **Textevents are baked at creation time**, not dynamic. The AI generates them when the user saves from Create mode (or manually via the "Generate with AI" button in TextEventEditor).
3. **Plan drafts live in Upstash** until pushed. Once pushed to intervals.icu calendar, they remain in Upstash too (for re-push / adjustment).
4. **All AI calls go through API routes** (`/api/ai/*`). The Gemini API key never reaches the client.
5. **Workout passed from Coach to Create** via `localStorage` key `coach:pendingWorkout`. Create page reads and clears it on mount.
6. **Plan passed from Coach to Plan** via `localStorage` key `plan:draft`. Plan page reads, clears, and immediately persists to Upstash.

### Potential Issues
- **IntervalsT `duration` field in our type:** The `duration` field on an `IntervalsT` block is computed (`repeat * (onDuration + offDuration)`). The `calculateDuration` function in `lib/zwo/intervals.ts` handles this correctly. When the AI generates a workout with IntervalsT blocks, it may set `duration` directly — that's fine, the .zwo generator uses `repeat`, `onDuration`, `offDuration` not `duration` for IntervalsT.
- **Cooldown power attributes:** Zwift's Cooldown uses `PowerHigh` for the start (high end) and `PowerLow` for the end (low end) — the inverse of what you might expect. The generator handles this correctly. Our internal model uses `powerHigh` = start of cooldown, `powerLow` = end of cooldown.
- **intervals.icu workout detail endpoint:** The free API does not reliably return block-level data for existing workouts (only the .zwo file). When "Open in Create" is clicked from Library, the Create page will load an empty builder unless the workout's block data is available. This is a known limitation of the free tier — document it in the UI.
- **Gemini response parsing:** The `parseJsonFromResponse` function in `lib/ai/gemini.ts` strips markdown fences. However Gemini 1.5 Flash may still return malformed JSON occasionally. Add a try/catch in the API route and return a 422 with the raw response for debugging.
