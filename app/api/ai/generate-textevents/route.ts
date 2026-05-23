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
