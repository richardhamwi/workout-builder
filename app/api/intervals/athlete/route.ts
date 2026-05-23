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
