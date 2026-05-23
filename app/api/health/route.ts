import { NextResponse } from 'next/server'

export async function GET() {
  const result = {
    redis: false,
    gemini: false,
    intervals: false,
  }

  // Check Redis
  try {
    const { getProfile } = await import('@/lib/redis/client')
    await getProfile()
    result.redis = true
  } catch {
    result.redis = false
  }

  // Check Gemini key (env var or Redis)
  if (process.env.GEMINI_API_KEY) {
    result.gemini = true
  } else if (result.redis) {
    try {
      const { getGeminiApiKey } = await import('@/lib/redis/client')
      const key = await getGeminiApiKey()
      result.gemini = !!key
    } catch {
      result.gemini = false
    }
  }

  // Check intervals.icu credentials (env vars or Redis)
  if (process.env.INTERVALS_API_KEY && process.env.INTERVALS_ATHLETE_ID) {
    result.intervals = true
  } else if (result.redis) {
    try {
      const { getIntervalsCredentials } = await import('@/lib/redis/client')
      const creds = await getIntervalsCredentials()
      result.intervals = !!(creds?.apiKey && creds?.athleteId)
    } catch {
      result.intervals = false
    }
  }

  const allOk = result.redis && result.gemini && result.intervals
  return NextResponse.json(result, { status: allOk ? 200 : 503 })
}
