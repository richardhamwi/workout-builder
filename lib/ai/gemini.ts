import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AIClient, ChatMessage, AthleteData, CoachingProfile, Workout, TrainingPlan, TextEvent } from '@/lib/types'

async function getModel() {
  let apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    try {
      const { getGeminiApiKey } = await import('@/lib/redis/client')
      apiKey = (await getGeminiApiKey()) ?? undefined
    } catch { /* Redis not configured */ }
  }
  if (!apiKey) throw new Error('Gemini API key not configured. Add it in Settings or set GEMINI_API_KEY in .env.local.')
  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
}

function parseJsonFromResponse(text: string): unknown {
  const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
  return JSON.parse(cleaned)
}

export class GeminiClient implements AIClient {
  async chat(messages: ChatMessage[], systemPrompt: string): Promise<string> {
    const model = await getModel()

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
    const model = await getModel()
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
    const model = await getModel()
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
    const model = await getModel()

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
