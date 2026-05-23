'use client'
import type { ChatMessage as ChatMessageType, Workout, TrainingPlan } from '@/lib/types'
import { GeneratedWorkoutCard } from './GeneratedWorkoutCard'

function extractStructured(content: string): { type: 'workout'; data: Workout } | { type: 'plan'; data: TrainingPlan } | null {
  const match = content.match(/\{["']type["']\s*:\s*["'](workout|plan)["'][\s\S]*?\}/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[0])
    if (parsed.type === 'workout' && parsed.data) return { type: 'workout', data: parsed.data }
    if (parsed.type === 'plan' && parsed.data) return { type: 'plan', data: parsed.data }
  } catch { /* ignore */ }
  return null
}

function cleanContent(content: string): string {
  return content.replace(/\{["']type["']\s*:\s*["'](workout|plan)["'][\s\S]*?\}\s*/g, '').trim()
}

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessageBubble({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const structured = !isUser ? extractStructured(message.content) : null
  const displayText = structured ? cleanContent(message.content) : message.content

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2 mb-4`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1">
          C
        </div>
      )}
      <div className={`max-w-[85%] ${isUser ? 'max-w-[75%]' : ''}`}>
        {displayText && (
          <div
            className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              isUser
                ? 'bg-indigo-600 text-white rounded-tr-sm'
                : 'bg-zinc-800 text-zinc-100 rounded-tl-sm'
            }`}
          >
            {displayText.split('\n').map((line, i) => (
              <p key={i} className={i > 0 ? 'mt-1' : ''}>{line}</p>
            ))}
          </div>
        )}

        {structured?.type === 'workout' && (
          <div className="mt-2">
            <GeneratedWorkoutCard workout={structured.data} />
          </div>
        )}

        {structured?.type === 'plan' && (
          <div className="mt-2 bg-zinc-800 border border-zinc-700 rounded-xl p-4">
            <p className="font-medium text-sm">{structured.data.name}</p>
            <p className="text-zinc-400 text-xs mt-1">{structured.data.weeks.length} weeks starting {structured.data.startDate}</p>
            <p className="text-xs text-zinc-500 mt-1">{structured.data.description}</p>
            <button
              onClick={() => {
                localStorage.setItem('plan:draft', JSON.stringify(structured.data))
                window.location.href = '/plan'
              }}
              className="mt-3 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg"
            >
              Open in Plan
            </button>
          </div>
        )}

        <p className={`text-[10px] text-zinc-600 mt-1 ${isUser ? 'text-right' : ''}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}
