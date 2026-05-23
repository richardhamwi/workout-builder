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
