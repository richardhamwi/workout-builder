import { NextRequest, NextResponse } from 'next/server'
import { createAIClient } from '@/lib/ai/client'
import type { ChatMessage } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const { messages, systemPrompt }: { messages: ChatMessage[]; systemPrompt: string } = await req.json()
    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 })
    }
    const client = createAIClient()
    const response = await client.chat(messages, systemPrompt ?? '')
    return NextResponse.json({ content: response })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
