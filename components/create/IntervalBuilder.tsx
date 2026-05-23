'use client'
import { useState, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { v4 as uuidv4 } from 'uuid'
import type { Workout, IntervalBlock, TextEvent } from '@/lib/types'
import { IntervalGraph } from './IntervalGraph'
import { BlockPalette } from './BlockPalette'
import { BlockEditor } from './BlockEditor'
import { TextEventEditor } from './TextEventEditor'
import { addBlock, removeBlock, reorderBlocks, updateBlock, calculateDuration } from '@/lib/zwo/intervals'

const EMPTY_WORKOUT: Workout = {
  name: 'My Workout',
  description: '',
  sportType: 'bike',
  durationSeconds: 0,
  blocks: [],
  textEventsEnabled: true,
}

interface IntervalBuilderProps {
  initialWorkout?: Workout
}

export function IntervalBuilder({ initialWorkout }: IntervalBuilderProps) {
  const [workout, setWorkout] = useState<Workout>(initialWorkout ?? EMPTY_WORKOUT)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [aiPromptOpen, setAiPromptOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const selectedBlock = workout.blocks.find((b) => b.id === selectedBlockId) ?? null

  const handleAddBlock = useCallback((block: IntervalBlock) => {
    setWorkout((w) => addBlock(w, block))
    setSelectedBlockId(block.id)
  }, [])

  const handleRemoveBlock = useCallback((id: string) => {
    setWorkout((w) => removeBlock(w, id))
    setSelectedBlockId(null)
  }, [])

  const handleBlockChange = useCallback((changes: Partial<IntervalBlock>) => {
    if (!selectedBlockId) return
    setWorkout((w) => updateBlock(w, selectedBlockId, changes))
  }, [selectedBlockId])

  const handleTextEventsChange = useCallback((updatedEvents: TextEvent[]) => {
    if (!selectedBlockId) return
    setWorkout((w) => updateBlock(w, selectedBlockId, { textEvents: updatedEvents }))
  }, [selectedBlockId])

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return
    setWorkout((w) => reorderBlocks(w, result.source.index, result.destination!.index))
  }

  async function handleAIGenerate() {
    if (!aiPrompt.trim()) return
    setAiLoading(true)
    try {
      const [athleteRes, profileRes] = await Promise.all([
        fetch('/api/intervals/athlete'),
        fetch('/api/profile'),
      ])
      const athleteData = await athleteRes.json()
      const profile = await profileRes.json()

      const res = await fetch('/api/ai/generate-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, athleteData, profile }),
      })
      if (!res.ok) throw new Error('AI generation failed')
      const generated: Workout = await res.json()
      generated.blocks = generated.blocks.map((b) => ({ ...b, id: uuidv4(), textEvents: b.textEvents ?? [] }))
      generated.durationSeconds = calculateDuration(generated.blocks)
      setWorkout(generated)
      setSelectedBlockId(null)
      setAiPromptOpen(false)
      setAiPrompt('')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'AI generation failed')
    } finally {
      setAiLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      const res = await fetch('/api/intervals/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workout),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Save failed')
      }
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const durationMin = Math.round(workout.durationSeconds / 60)

  return (
    <div className="flex flex-col gap-4 px-4 py-6 md:px-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1 flex flex-col gap-2">
          <input
            value={workout.name}
            onChange={(e) => setWorkout((w) => ({ ...w, name: e.target.value }))}
            className="text-xl font-bold bg-transparent border-b border-zinc-700 focus:border-indigo-500 outline-none pb-1"
            placeholder="Workout name"
          />
          <input
            value={workout.description}
            onChange={(e) => setWorkout((w) => ({ ...w, description: e.target.value }))}
            className="text-sm text-zinc-400 bg-transparent border-b border-zinc-800 focus:border-zinc-600 outline-none pb-1"
            placeholder="Description (optional)"
          />
          <p className="text-xs text-zinc-600">{durationMin} min total</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">Text events</span>
            <button
              onClick={() => setWorkout((w) => ({ ...w, textEventsEnabled: !w.textEventsEnabled }))}
              className={`w-9 h-5 rounded-full transition-colors ${
                workout.textEventsEnabled ? 'bg-indigo-600' : 'bg-zinc-700'
              } relative`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  workout.textEventsEnabled ? 'translate-x-4' : ''
                }`}
              />
            </button>
          </div>
          <button
            onClick={() => setAiPromptOpen(true)}
            className="text-sm bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            Start from AI
          </button>
          <button
            onClick={handleSave}
            disabled={saving || workout.blocks.length === 0}
            className="text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg transition-colors font-medium"
          >
            {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save to Library'}
          </button>
        </div>
      </div>

      {saveError && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-2 text-red-400 text-sm">
          {saveError}
        </div>
      )}

      {/* AI Prompt modal */}
      {aiPromptOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-semibold mb-2">Generate workout with AI</h3>
            <p className="text-zinc-400 text-sm mb-4">
              Describe what you want. Your fitness data will be included automatically.
            </p>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm outline-none resize-none mb-4"
              placeholder="e.g. 45-min sweet spot session with a hard finish"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setAiPromptOpen(false); setAiPrompt('') }}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAIGenerate}
                disabled={aiLoading || !aiPrompt.trim()}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium"
              >
                {aiLoading ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Graph */}
      <IntervalGraph
        blocks={workout.blocks}
        selectedBlockId={selectedBlockId}
        onSelectBlock={setSelectedBlockId}
      />

      {/* Main editor area */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left: block list + palette */}
        <div className="flex flex-col gap-4 lg:w-64 flex-shrink-0">
          <BlockPalette onAddBlock={handleAddBlock} />

          {workout.blocks.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Blocks</p>
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="blocks">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="flex flex-col gap-1">
                      {workout.blocks.map((block, index) => (
                        <Draggable key={block.id} draggableId={block.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => setSelectedBlockId(block.id)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                                block.id === selectedBlockId
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
                              } ${snapshot.isDragging ? 'shadow-lg ring-1 ring-indigo-500' : ''}`}
                            >
                              <span className="text-zinc-600 text-xs">⠿</span>
                              <span className="flex-1 truncate">{block.type}</span>
                              <span className="text-xs opacity-60">{Math.round(block.duration / 60)}m</span>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          )}
        </div>

        {/* Right: editor panels */}
        {selectedBlock ? (
          <div className="flex-1 flex flex-col gap-4">
            <BlockEditor
              block={selectedBlock}
              onChange={handleBlockChange}
              onDelete={() => handleRemoveBlock(selectedBlock.id)}
            />
            {workout.textEventsEnabled && (
              <TextEventEditor
                block={selectedBlock}
                workout={workout}
                onChange={handleTextEventsChange}
              />
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm min-h-[120px]">
            Select a block to edit it, or add blocks from the palette.
          </div>
        )}
      </div>
    </div>
  )
}
