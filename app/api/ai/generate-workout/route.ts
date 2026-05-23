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
