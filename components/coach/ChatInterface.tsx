'use client'
import { useState, useRef, useEffect } from 'react'
import type { ChatMessage, AthleteData, CoachingProfile } from '@/lib/types'
import { ChatMessageBubble } from './ChatMessage'
import { QuickStartSuggestions } from './QuickStartSuggestions'

function generateId(): string {
  return crypto.randomUUID()
}

function buildSystemPrompt(athleteData: AthleteData, profile: CoachingProfile): string {
  const activitySummary = athleteData.recentActivities
    .slice(0, 10)
    .map(
      (a) =>
        `  - ${a.date}: ${a.type} ${Math.round(a.durationSeconds / 60)}min TSS:${a.tss}${a.averageHR ? ` HR:${a.averageHR}` : ''}`
    )
    .join('\n')

  const availableDays = profile.availableDays
    .filter((d) => d.available)
    .map((d) => `${d.day} (max ${d.maxSessionMinutes}min)`)
    .join(', ')

  return `You are a personal cycling coach with access to the athlete's real-time training data.

ATHLETE:
- FTP: ${athleteData.ftp}W | Weight: ${athleteData.weight}kg
- CTL: ${athleteData.ctl} (fitness) | ATL: ${athleteData.atl} (fatigue) | TSB: ${athleteData.tsb} (form)
- Last 14 days:
${activitySummary || '  No recent activities'}

COACHING PROFILE:
- Goals: ${profile.goals.join(', ') || 'Not specified'}
- Constraints: ${profile.constraints.join(', ') || 'None'}
- Available: ${availableDays || 'Not specified'}
- Preferences: ${profile.preferences.join(', ') || 'None'}
- Target events: ${profile.targetEvents.join(', ') || 'None'}

RULES:
- Prefer short structured sessions (45-60 min) over long Zone 2
- Sweet spot and VO2 max are primary zones
- Always explain the science when giving training advice
- To output a workout, wrap it: {"type":"workout","data":{...WorkoutJSON}}
- To output a plan, wrap it: {"type":"plan","data":{...PlanJSON}}
- Keep responses concise — the athlete is probably time-poor`
}

interface ChatInterfaceProps {
  athleteData: AthleteData
  profile: CoachingProfile
}

export function ChatInterface({ athleteData, profile }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text: string) {
    if (!text.trim() || sending) return

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setSending(true)

    try {
      const systemPrompt = buildSystemPrompt(athleteData, profile)
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, systemPrompt }),
      })

      if (!res.ok) throw new Error('Chat request failed')
      const data: { content: string } = await res.json()

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date().toISOString(),
      }
      setMessages([...newMessages, assistantMessage])
    } catch {
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date().toISOString(),
      }
      setMessages([...newMessages, errorMessage])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
        {messages.length === 0 ? (
          <QuickStartSuggestions onSelect={sendMessage} />
        ) : (
          <div className="max-w-2xl mx-auto">
            {messages.map((m) => (
              <ChatMessageBubble key={m.id} message={m} />
            ))}
            {sending && (
              <div className="flex gap-2 mb-4">
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0">C</div>
                <div className="bg-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1 items-center h-5">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t border-zinc-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage(input)
              }
            }}
            placeholder="Ask your coach..."
            disabled={sending}
            className="flex-1 bg-zinc-800 border border-zinc-700 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm outline-none disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={sending || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 rounded-xl text-sm font-medium transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
