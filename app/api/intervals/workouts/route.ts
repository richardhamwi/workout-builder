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
