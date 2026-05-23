'use client'
import type { IntervalBlock } from '@/lib/types'

function zoneColor(power: number): string {
  if (power < 0.56) return '#6b7280'
  if (power < 0.76) return '#60a5fa'
  if (power < 0.88) return '#34d399'
  if (power < 1.05) return '#fbbf24'
  if (power < 1.20) return '#f97316'
  return '#ef4444'
}

interface BlockRect {
  block: IntervalBlock
  x: number
  width: number
  subRects?: { x: number; width: number; power: number; isOn: boolean }[]
}

function layoutBlocks(blocks: IntervalBlock[]): BlockRect[] {
  const total = blocks.reduce((sum, b) => {
    if (b.type === 'IntervalsT') {
      return sum + (b.repeat ?? 1) * ((b.onDuration ?? 0) + (b.offDuration ?? 0))
    }
    return sum + b.duration
  }, 0)
  if (total === 0) return []

  let cursor = 0
  return blocks.map((block) => {
    let blockDuration: number

    if (block.type === 'IntervalsT') {
      blockDuration = (block.repeat ?? 1) * ((block.onDuration ?? 0) + (block.offDuration ?? 0))
    } else {
      blockDuration = block.duration
    }

    const x = (cursor / total) * 100
    const width = (blockDuration / total) * 100

    let subRects: BlockRect['subRects']
    if (block.type === 'IntervalsT') {
      subRects = []
      const onDur = block.onDuration ?? 60
      const offDur = block.offDuration ?? 60
      const onP = block.onPower ?? 1.1
      const offP = block.offPower ?? 0.5
      const repeat = block.repeat ?? 1
      let subCursor = cursor

      for (let i = 0; i < repeat; i++) {
        const onX = (subCursor / total) * 100
        const onW = (onDur / total) * 100
        subRects.push({ x: onX, width: onW, power: onP, isOn: true })
        subCursor += onDur

        const offX = (subCursor / total) * 100
        const offW = (offDur / total) * 100
        subRects.push({ x: offX, width: offW, power: offP, isOn: false })
        subCursor += offDur
      }
    }

    cursor += blockDuration

    return { block, x, width, subRects }
  })
}

function blockPower(block: IntervalBlock): number {
  if (block.power) return block.power
  if (block.powerHigh) return (block.powerHigh + (block.powerLow ?? block.powerHigh)) / 2
  return 0.6
}

function powerToHeight(power: number): number {
  return Math.min(60, Math.max(4, (power / 1.5) * 60))
}

interface IntervalGraphProps {
  blocks: IntervalBlock[]
  selectedBlockId?: string | null
  onSelectBlock?: (id: string) => void
}

export function IntervalGraph({ blocks, selectedBlockId, onSelectBlock }: IntervalGraphProps) {
  const rects = layoutBlocks(blocks)

  return (
    <div className="w-full bg-zinc-900 rounded-xl border border-zinc-700 p-3">
      {blocks.length === 0 ? (
        <div className="h-16 flex items-center justify-center text-zinc-600 text-sm">
          Add blocks to see the workout graph
        </div>
      ) : (
        <svg
          viewBox="0 0 100 65"
          className="w-full"
          style={{ height: '72px' }}
          preserveAspectRatio="none"
        >
          {[0.56, 0.76, 0.88, 1.05, 1.20].map((p) => {
            const y = 60 - powerToHeight(p)
            return (
              <line
                key={p}
                x1="0" y1={y} x2="100" y2={y}
                stroke="#3f3f46"
                strokeWidth="0.3"
                strokeDasharray="1,1"
              />
            )
          })}

          {rects.map((r) => {
            const isSelected = r.block.id === selectedBlockId

            if (r.subRects && r.subRects.length > 0) {
              return r.subRects.map((sr, i) => {
                const h = powerToHeight(sr.power)
                const y = 60 - h
                return (
                  <rect
                    key={`${r.block.id}-sub-${i}`}
                    x={sr.x.toFixed(2)}
                    y={y.toFixed(2)}
                    width={Math.max(0.3, sr.width - 0.2).toFixed(2)}
                    height={h.toFixed(2)}
                    fill={zoneColor(sr.power)}
                    opacity={isSelected ? 1 : 0.85}
                    rx="0.3"
                    className="cursor-pointer"
                    onClick={() => onSelectBlock?.(r.block.id)}
                    style={isSelected ? { filter: 'drop-shadow(0 0 2px rgba(99,102,241,0.8))' } : undefined}
                  />
                )
              })
            }

            const power = blockPower(r.block)
            const h = powerToHeight(power)
            const y = 60 - h

            if (r.block.type === 'Warmup' || r.block.type === 'Cooldown' || r.block.type === 'Ramp') {
              const lowPower = r.block.powerLow ?? 0.45
              const highPower = r.block.powerHigh ?? 0.75
              const isWarmup = r.block.type === 'Warmup' || r.block.type === 'Ramp'
              const startPower = isWarmup ? lowPower : highPower
              const endPower = isWarmup ? highPower : lowPower
              const startH = powerToHeight(startPower)
              const endH = powerToHeight(endPower)
              const x1 = r.x.toFixed(2)
              const x2 = (r.x + r.width).toFixed(2)
              const points = [
                `${x1},60`,
                `${x1},${(60 - startH).toFixed(2)}`,
                `${x2},${(60 - endH).toFixed(2)}`,
                `${x2},60`,
              ].join(' ')

              return (
                <polygon
                  key={r.block.id}
                  points={points}
                  fill={zoneColor((startPower + endPower) / 2)}
                  opacity={isSelected ? 1 : 0.85}
                  className="cursor-pointer"
                  onClick={() => onSelectBlock?.(r.block.id)}
                  style={isSelected ? { filter: 'drop-shadow(0 0 2px rgba(99,102,241,0.8))' } : undefined}
                />
              )
            }

            return (
              <rect
                key={r.block.id}
                x={r.x.toFixed(2)}
                y={y.toFixed(2)}
                width={Math.max(0.3, r.width - 0.2).toFixed(2)}
                height={h.toFixed(2)}
                fill={zoneColor(power)}
                opacity={isSelected ? 1 : 0.85}
                rx="0.3"
                className="cursor-pointer"
                onClick={() => onSelectBlock?.(r.block.id)}
                style={isSelected ? { filter: 'drop-shadow(0 0 2px rgba(99,102,241,0.8))' } : undefined}
              />
            )
          })}

          {rects
            .filter((r) => r.block.id === selectedBlockId)
            .map((r) => (
              <rect
                key={`sel-${r.block.id}`}
                x={r.x.toFixed(2)}
                y="62"
                width={r.width.toFixed(2)}
                height="2"
                fill="#6366f1"
                rx="1"
              />
            ))}
        </svg>
      )}

      <div className="flex gap-3 mt-2 flex-wrap">
        {[
          { label: 'Z1', color: '#6b7280' },
          { label: 'Z2', color: '#60a5fa' },
          { label: 'Z3', color: '#34d399' },
          { label: 'SS', color: '#fbbf24' },
          { label: 'Z5', color: '#f97316' },
          { label: 'Z6+', color: '#ef4444' },
        ].map((z) => (
          <span key={z.label} className="flex items-center gap-1 text-[10px] text-zinc-500">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ background: z.color }} />
            {z.label}
          </span>
        ))}
      </div>
    </div>
  )
}
