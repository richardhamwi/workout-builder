import { NextRequest, NextResponse } from 'next/server'
import { getIntervalsCredentials, setIntervalsCredentials } from '@/lib/redis/client'

export async function GET() {
  try {
    const stored = await getIntervalsCredentials()
    if (!stored) return NextResponse.json({ hasKey: false, athleteId: '' })
    return NextResponse.json({
      hasKey: !!stored.apiKey,
      // Return masked key so the UI can show "configured" without exposing the value
      apiKeyMasked: stored.apiKey ? '••••••••' + stored.apiKey.slice(-4) : '',
      athleteId: stored.athleteId,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { apiKey, athleteId } = await req.json()
    if (!athleteId) return NextResponse.json({ error: 'athleteId is required' }, { status: 400 })

    // If apiKey is empty or masked, keep the existing one
    if (!apiKey || apiKey.startsWith('••••')) {
      const existing = await getIntervalsCredentials()
      await setIntervalsCredentials({ apiKey: existing?.apiKey ?? '', athleteId })
    } else {
      await setIntervalsCredentials({ apiKey, athleteId })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
