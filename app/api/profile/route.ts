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
