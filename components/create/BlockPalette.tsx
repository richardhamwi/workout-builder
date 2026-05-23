'use client'
import { v4 as uuidv4 } from 'uuid'
import type { IntervalBlock, BlockType } from '@/lib/types'

interface PaletteBlock {
  type: BlockType
  label: string
  description: string
  defaults: Partial<IntervalBlock>
}

const PALETTE: PaletteBlock[] = [
  {
    type: 'Warmup',
    label: 'Warmup',
    description: '10 min Z2→Z3',
    defaults: { duration: 600, powerLow: 0.45, powerHigh: 0.75 },
  },
  {
    type: 'SteadyState',
    label: 'Steady State',
    description: '10 min at 88%',
    defaults: { duration: 600, power: 0.88 },
  },
  {
    type: 'IntervalsT',
    label: 'Intervals',
    description: '5×3min at 110%',
    defaults: { repeat: 5, onDuration: 180, offDuration: 180, onPower: 1.10, offPower: 0.50, duration: 1800 },
  },
  {
    type: 'Ramp',
    label: 'Ramp',
    description: '20 min 60→100%',
    defaults: { duration: 1200, powerLow: 0.60, powerHigh: 1.00 },
  },
  {
    type: 'Cooldown',
    label: 'Cooldown',
    description: '5 min Z1',
    defaults: { duration: 300, powerHigh: 0.60, powerLow: 0.35 },
  },
]

interface BlockPaletteProps {
  onAddBlock: (block: IntervalBlock) => void
}

export function BlockPalette({ onAddBlock }: BlockPaletteProps) {
  function handleAdd(template: PaletteBlock) {
    const block: IntervalBlock = {
      id: uuidv4(),
      type: template.type,
      duration: template.defaults.duration ?? 300,
      textEvents: [],
      ...template.defaults,
    }
    onAddBlock(block)
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Add Block</p>
      {PALETTE.map((template) => (
        <button
          key={template.type}
          onClick={() => handleAdd(template)}
          className="flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 rounded-lg px-3 py-2.5 text-left transition-colors"
        >
          <div>
            <p className="text-sm font-medium text-white">{template.label}</p>
            <p className="text-xs text-zinc-500">{template.description}</p>
          </div>
        </button>
      ))}
    </div>
  )
}
