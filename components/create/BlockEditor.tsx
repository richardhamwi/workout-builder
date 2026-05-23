'use client'
import type { IntervalBlock } from '@/lib/types'

interface BlockEditorProps {
  block: IntervalBlock
  onChange: (changes: Partial<IntervalBlock>) => void
  onDelete: () => void
}

function NumField({
  label, value, onChange, min, max, step = 1, suffix
}: {
  label: string
  value: number | undefined
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-zinc-400">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          min={min}
          max={max}
          step={step}
          className="bg-zinc-800 border border-zinc-700 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-sm outline-none w-full"
        />
        {suffix && <span className="text-xs text-zinc-500 flex-shrink-0">{suffix}</span>}
      </div>
    </div>
  )
}

export function BlockEditor({ block, onChange, onDelete }: BlockEditorProps) {
  const durationMin = Math.round((block.duration ?? 0) / 60)

  function setDurationMin(m: number) {
    onChange({ duration: Math.round(m * 60) })
  }

  function setPowerPercent(field: 'power' | 'powerLow' | 'powerHigh' | 'onPower' | 'offPower', pct: number) {
    onChange({ [field]: pct / 100 })
  }

  function getPowerPct(field: 'power' | 'powerLow' | 'powerHigh' | 'onPower' | 'offPower') {
    const val = block[field]
    return val !== undefined ? Math.round(val * 100) : undefined
  }

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{block.type} Block</h3>
        <button
          onClick={onDelete}
          className="text-zinc-500 hover:text-red-400 text-xs transition-colors"
        >
          Remove
        </button>
      </div>

      {block.type !== 'IntervalsT' && (
        <NumField
          label="Duration"
          value={durationMin}
          onChange={setDurationMin}
          min={1} max={300} step={1}
          suffix="min"
        />
      )}

      {(block.type === 'Warmup' || block.type === 'Cooldown' || block.type === 'Ramp') && (
        <div className="grid grid-cols-2 gap-3">
          <NumField
            label={block.type === 'Cooldown' ? 'Start power' : 'Low power'}
            value={getPowerPct('powerLow')}
            onChange={(v) => setPowerPercent('powerLow', v)}
            min={20} max={150} step={1}
            suffix="% FTP"
          />
          <NumField
            label={block.type === 'Cooldown' ? 'End power' : 'High power'}
            value={getPowerPct('powerHigh')}
            onChange={(v) => setPowerPercent('powerHigh', v)}
            min={20} max={150} step={1}
            suffix="% FTP"
          />
        </div>
      )}

      {block.type === 'SteadyState' && (
        <NumField
          label="Power"
          value={getPowerPct('power')}
          onChange={(v) => setPowerPercent('power', v)}
          min={20} max={150} step={1}
          suffix="% FTP"
        />
      )}

      {block.type === 'IntervalsT' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Repeats" value={block.repeat} onChange={(v) => onChange({ repeat: v })} min={1} max={30} />
            <NumField label="Cadence" value={block.cadence} onChange={(v) => onChange({ cadence: v })} min={60} max={120} suffix="rpm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumField
              label="On duration"
              value={block.onDuration !== undefined ? Math.round(block.onDuration / 60) : undefined}
              onChange={(v) => onChange({ onDuration: Math.round(v * 60) })}
              min={0.5} step={0.5}
              suffix="min"
            />
            <NumField
              label="Off duration"
              value={block.offDuration !== undefined ? Math.round(block.offDuration / 60) : undefined}
              onChange={(v) => onChange({ offDuration: Math.round(v * 60) })}
              min={0.5} step={0.5}
              suffix="min"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumField
              label="On power"
              value={getPowerPct('onPower')}
              onChange={(v) => setPowerPercent('onPower', v)}
              min={50} max={200} step={1}
              suffix="% FTP"
            />
            <NumField
              label="Off power"
              value={getPowerPct('offPower')}
              onChange={(v) => setPowerPercent('offPower', v)}
              min={20} max={100} step={1}
              suffix="% FTP"
            />
          </div>
        </>
      )}

      {block.type !== 'IntervalsT' && (
        <NumField
          label="Cadence (optional)"
          value={block.cadence}
          onChange={(v) => onChange({ cadence: v })}
          min={60} max={120}
          suffix="rpm"
        />
      )}
    </div>
  )
}
