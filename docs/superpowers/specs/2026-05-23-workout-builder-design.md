# Workout Builder — Design Spec
_Date: 2026-05-23_

## What This App Is

A cycling training companion that sits on top of intervals.icu. It does three things intervals.icu doesn't: gives you an AI coach that already knows your fitness data, generates and builds structured workouts (including science-rich textevents embedded in `.zwo` files), and pushes completed plans to intervals.icu without drag-and-drop.

intervals.icu remains the source of truth for the workout library, calendar, CTL tracking, and outdoor rides. This app is where the thinking happens.

---

## Core Constraints

- **Free to run** — $0/month total infrastructure cost
- **Single user** — no multi-user support, no auth system
- **Cycling only** for MVP — AI coaching is sport-aware but workout creation, library, and sync are cycling-only
- **Smart layer, not a replacement** — intervals.icu owns the calendar and metrics

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js + TypeScript | API routes keep keys server-side; Vercel deployment |
| Hosting | Vercel Hobby | Free |
| Storage | Upstash Redis | Free tier (10k cmds/day); coaching profile + plan drafts |
| AI | Gemini Flash (Google AI Studio) | Free tier (1,500 req/day) |
| AI abstraction | Thin model-agnostic layer | Swap to Claude/GPT-4o in one config change when ready |
| intervals.icu auth | API key | Paste once during onboarding, stored in env var |

**Environment variables:**
```
INTERVALS_API_KEY=
GEMINI_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

---

## Navigation

- **Desktop:** Sidebar with four mode tabs, always visible
- **Mobile:** Bottom tab bar (thumbs-friendly)
- **Modes:** Coach · Plan · Create · Library

---

## Mode 1: Coach

A chat interface. Every session opens with intervals.icu data already loaded — no re-explaining yourself.

**Context injected automatically into every session:**
- FTP, weight
- CTL, ATL, TSB (today's values)
- Last 14 days of completed workouts (type, duration, TSS, HR)
- Coaching profile (goals, constraints, available days, preferences)

**Quick-start suggestions:** When the chat is empty, 3–4 context-aware prompts appear ("Plan my next week", "Generate a hard 45-minute session for Tuesday", "I'm feeling flat, what should I do?"). They disappear when typing begins.

**Output handling:**
- Generated single workout → auto-saves to intervals.icu (Library) + inline "Open in Create" button
- Generated multi-week plan → lands in Plan mode for review
- The user can request single sessions or full multi-week blocks

---

## Mode 2: Plan

**Two levels:**

1. **Block view** — the strategic arc of a multi-week plan (e.g. "8-week FTP builder: weeks 1–2 base, 3–4 build, 5–6 overload, 7 peak, 8 recovery")
2. **Weekly view** — drill into each week, see every session slot

**Workflow:**
- AI fills in all indoor sessions as fully-specified workouts
- User reviews and adjusts — AI-first ("make week 3 a recovery week") with direct manipulation (swap from library, reorder) as secondary
- Outdoor rides are out of scope — user manages those directly in intervals.icu

**Pushing to intervals.icu:**
- Conflict check per day — if a day already has an event, show a per-day warning: skip or add alongside

**Workout references:** Workouts in a plan are references to the library entry, not copies. Editing a workout updates it everywhere it's used.

---

## Mode 3: Create

A visual interval builder. Fully manual is a first-class option — AI is a shortcut, not a requirement.

**Three entry points:**
1. Start from scratch — drag and build manually
2. Start from AI prompt — AI generates structure, drops you into the editor
3. Open existing library workout — loads into editor for modification

**Block palette:** Warmup · SteadyState · IntervalsT (repeating on/off) · Ramp · Cooldown

Each block has editable: power target(s), duration, cadence, repeat count.

**Textevents:**
- AI auto-generates textevents on save (global toggle to disable)
- Pre-baked at creation time, embedded in the `.zwo` file
- Generated based on workout structure (block type, intensity, duration, position in session)
- Editable after generation — add, delete, or modify individual textevents

**On save:** Workout writes directly to intervals.icu (the library). No separate app-side storage.

---

## Mode 4: Library

All workouts pulled live from intervals.icu.

**Search and filter:**
- Search by name
- Filter by type (sweet spot, VO2, tempo, recovery, etc.)
- Filter by duration range

**Workout card shows:** Name · Duration · Primary zone · Mini interval graph preview

**Actions from Library:**
- Open in Create (to edit)
- Add directly to a Plan slot

---

## Coaching Profile

**Set up once** via a short conversational questionnaire in Coach mode on first launch.

**Stored fields:**
- Available training days + typical session length per day
- Current goals (e.g. "build FTP", "lose weight", "sustain fitness")
- Constraints (time-poor, low motivation for long Zone 2, etc.)
- Preferences (indoor only for structured sessions)
- Target events or races if any

**Two ways to update:**
- **Settings page** — quick direct edits (change a day, adjust session length)
- **"Update my profile" in Coach** — AI walks you through it conversationally for bigger life changes, updates stored values

---

## Textevent Content Model

Textevents are pre-baked at workout creation time. The AI authors them based on block type, intensity, duration, and position in the session.

### Content categories (priority order)

| Priority | Category | Description |
|---|---|---|
| Primary | Physiology | What's happening in the body right now. Short, specific, accurate. |
| Primary | Motivation | Forward-driving, tied to where you are in the interval. Not generic. |
| Supporting | Technique cues | Actionable, not obvious. Cadence, body position, pedal stroke. |
| Supporting | Pacing guidance | Especially important at the start of hard blocks. |
| Supporting | Recovery cues | Recovery blocks only. Purposeful, not filler. |
| Conditional | Nutrition reminders | Sessions 60+ mins only. Practical and timed. |

### Density rules

| Block type | Max textevents | Timing |
|---|---|---|
| Short interval (<3 min) | 1–2 | Start + optional final push |
| Medium interval (3–10 min) | 2–3 | Start, mid-way, near end |
| Long block (10+ min) | 3–4 | Every 3–4 minutes |
| Recovery | 1 | Start only |
| Warmup / Cooldown | 1–2 | Scene-setting at start, wind-down at end |

---

## Workout Data Flow

```
Coach generates workout
  → auto-saves to intervals.icu (Library)
  → "Open in Create" available inline

Create builds/edits workout
  → saves to intervals.icu (Library)
  → AI generates textevents on save (toggle off if not wanted)
  → workout with embedded textevents pushed to intervals.icu

Plan slots workouts (references, not copies)
  → AI fills, user reviews and adjusts
  → Push to intervals.icu calendar
  → Per-day conflict check: skip or add alongside

intervals.icu is always the source of truth for workouts and calendar
Upstash Redis stores: coaching profile, plan drafts not yet pushed
```

---

## MVP Scope

### In scope
- intervals.icu API key connection
- Coaching profile setup + Settings page + AI-guided profile update
- Coach mode: chat with auto-injected fitness context, quick-start suggestions, workout and plan generation
- Plan mode: block + weekly view, AI fills, review and adjust, push with conflict warnings
- Create mode: visual interval builder, optional AI start, fully manual, AI-generated pre-baked textevents with toggle
- Library mode: search, filter, open in Create, add to Plan
- `.zwo` generation with embedded textevents pushed to intervals.icu
- Responsive web app (sidebar desktop, bottom tabs mobile)

### Explicitly out of scope for MVP
- Running support
- Dynamic contextual textevents (plan-aware, generated at workout time) — designed, parked for v2
- Multi-user / auth system
- OAuth with intervals.icu
- Native mobile app
- Nutrition tracking beyond in-workout reminders

---

## Future Features (Designed, Not Built)

### Dynamic textevents (v2)
The killer differentiator. Textevents generated at workout time, not creation time:
- **Plan-aware:** "You're in week 3 of your FTP builder — your aerobic base is now solid enough to handle this load"
- **History-aware:** "You've done this workout twice before — last time the final interval is where you faded. Today, stay conservative through interval 2."
- Same `.zwo` structure, fresh companion every time

Trigger: "Prepare workout" action from Plan or Library on the day of the session. Generates a contextual `.zwo` with fresh textevents, ready to sync.

### Running support
Different metrics (pace zones vs power), different file formats. Separate design effort after cycling is solid.

### Textevent research
Deep analysis of Zwift community `.zwo` files to refine the textevent content model. Informs tone, length, and category weighting.
