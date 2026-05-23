import { NextRequest, NextResponse } from 'next/server'
import { getIntervalsCredentials, setIntervalsCredentials, getGeminiApiKey, setGeminiApiKey } from '@/lib/redis/client'

export async function GET() {
  try {
    const [stored, geminiKey] = await Promise.all([
      getIntervalsCredentials(),
      getGeminiApiKey(),
    ])
    return NextResponse.json({
      hasKey: !!stored?.apiKey,
      apiKeyMasked: stored?.apiKey ? '••••••••' + stored.apiKey.slice(-4) : '',
      athleteId: stored?.athleteId ?? '',
      hasGeminiKey: !!geminiKey,
      geminiKeyMasked: geminiKey ? '••••••••' + geminiKey.slice(-4) : '',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { apiKey, athleteId, geminiKey } = await req.json()

    // Handle intervals credentials
    if (apiKey !== undefined || athleteId !== undefined) {
      if (!athleteId && athleteId !== undefined) {
        return NextResponse.json({ error: 'athleteId is required' }, { status: 400 })
      }
      if (athleteId !== undefined) {
        if (!apiKey || apiKey.startsWith('••••')) {
          const existing = await getIntervalsCredentials()
          await setIntervalsCredentials({ apiKey: existing?.apiKey ?? '', athleteId })
        } else {
          await setIntervalsCredentials({ apiKey, athleteId })
        }
      }
    }

    // Handle Gemini key
    if (geminiKey !== undefined && geminiKey && !geminiKey.startsWith('••••')) {
      await setGeminiApiKey(geminiKey)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
