'use client'
import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { TextEvent, TextEventCategory, IntervalBlock, Workout } from '@/lib/types'

const CATEGORY_COLORS: Record<TextEventCategory, string> = {
  physiology: 'bg-blue-700',
  motivation: 'bg-indigo-600',
  technique:  'bg-teal-700',
  pacing:     'bg-yellow-700',
  recovery:   'bg-green-800',
  nutrition:  'bg-orange-700',
}

const CATEGORIES: TextEventCategory[] = ['physiology', 'motivation', 'technique', 'pacing', 'recovery', 'nutrition']

interface TextEventEditorProps {
  block: IntervalBlock
  workout: Workout
  onChange: (updatedEvents: TextEvent[]) => void
}

interface InlineForm {
  id?: string
  timeOffset: number
  message: string
  category: TextEventCategory
  duration: number
}

const EMPTY_FORM: InlineForm = {
  timeOffset: 0,
  message: '',
  category: 'physiology',
  duration: 10,
}

export function TextEventEditor({ block, workout, onChange }: TextEventEditorProps) {
  const [form, setForm] = useState<InlineForm | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const events = block.textEvents ?? []

  function openAdd() {
    setForm({ ...EMPTY_FORM })
    setError(null)
  }

  function openEdit(te: TextEvent) {
    setForm({
      id: te.id,
      timeOffset: te.timeOffset,
      message: te.message,
      category: te.category,
      duration: te.duration,
    })
    setError(null)
  }

  function cancelForm() {
    setForm(null)
    setError(null)
  }

  function saveForm() {
    if (!form) return
    if (!form.message.trim()) {
      setError('Message is required')
      return
    }

    const newEvent: TextEvent = {
      id: form.id ?? uuidv4(),
      message: form.message.trim(),
      timeOffset: form.timeOffset,
      duration: form.duration,
      category: form.category,
    }

    if (form.id) {
      onChange(events.map((e) => (e.id === form.id ? newEvent : e)))
    } else {
      const sorted = [...events, newEvent].sort((a, b) => a.timeOffset - b.timeOffset)
      onChange(sorted)
    }
    setForm(null)
    setError(null)
  }

  function deleteEvent(id: string) {
    onChange(events.filter((e) => e.id !== id))
  }

  async function generateWithAI() {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/generate-textevents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workout }),
      })
      if (!res.ok) throw new Error('Generation failed')
      const data: { textEventsByBlock: TextEvent[][] } = await res.json()

      const blockIndex = workout.blocks.findIndex((b) => b.id === block.id)
      const generated = data.textEventsByBlock[blockIndex] ?? []
      const withIds = generated.map((te) => ({ ...te, id: te.id || uuidv4() }))
      onChange(withIds)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate textevents')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Text Events</h3>
        <div className="flex gap-2">
          <button
            onClick={generateWithAI}
            disabled={generating}
            className="text-xs bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            {generating ? 'Generating...' : 'Generate with AI'}
          </button>
          <button
            onClick={openAdd}
            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            + Add
          </button>
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-xs">{error}</p>
      )}

      {events.length === 0 && !form && (
        <p className="text-zinc-600 text-xs text-center py-4">
          No text events. Add one manually or use AI generation.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        {events.map((te) => (
          <div
            key={te.id}
            className="flex items-start gap-2 bg-zinc-800 rounded-lg px-3 py-2"
          >
            <span className="text-[10px] text-zinc-500 mt-0.5 w-8 flex-shrink-0">{te.timeOffset}s</span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${CATEGORY_COLORS[te.category]} text-white`}>
              {te.category}
            </span>
            <p className="text-xs text-zinc-300 flex-1 leading-snug line-clamp-2">{te.message}</p>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => openEdit(te)} className="text-[10px] text-zinc-500 hover:text-white">Edit</button>
              <button onClick={() => deleteEvent(te.id)} className="text-[10px] text-zinc-500 hover:text-red-400">Del</button>
            </div>
          </div>
        ))}
      </div>

      {form && (
        <div className="bg-zinc-700 border border-zinc-600 rounded-xl p-4 flex flex-col gap-3">
          <h4 className="text-sm font-medium">{form.id ? 'Edit' : 'New'} Text Event</h4>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-400">Message</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm((f) => f && { ...f, message: e.target.value })}
              rows={2}
              className="bg-zinc-800 border border-zinc-600 focus:border-indigo-500 rounded-lg px-2.5 py-2 text-sm outline-none resize-none"
              placeholder="What should the rider see?"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-400">Time offset (s)</label>
              <input
                type="number"
                value={form.timeOffset}
                onChange={(e) => setForm((f) => f && { ...f, timeOffset: parseInt(e.target.value) || 0 })}
                min={0}
                max={block.duration}
                className="bg-zinc-800 border border-zinc-600 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-sm outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-400">Display duration (s)</label>
              <input
                type="number"
                value={form.duration}
                onChange={(e) => setForm((f) => f && { ...f, duration: parseInt(e.target.value) || 10 })}
                min={3} max={60}
                className="bg-zinc-800 border border-zinc-600 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-sm outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-400">Category</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setForm((f) => f && { ...f, category: cat })}
                  className={`text-[10px] font-medium px-2 py-1 rounded transition-colors ${
                    form.category === cat ? `${CATEGORY_COLORS[cat]} text-white` : 'bg-zinc-700 text-zinc-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-2">
            <button onClick={cancelForm} className="flex-1 bg-zinc-600 hover:bg-zinc-500 text-white text-sm py-2 rounded-lg">Cancel</button>
            <button onClick={saveForm} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm py-2 rounded-lg">Save</button>
          </div>
        </div>
      )}
    </div>
  )
}
