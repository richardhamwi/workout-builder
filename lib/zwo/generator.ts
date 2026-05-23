import type { Workout, IntervalBlock, TextEvent } from '@/lib/types'

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderTextEvent(te: TextEvent): string {
  return `            <textevent timeoffset="${te.timeOffset}" message="${escapeXml(te.message)}" duration="${te.duration}"/>`
}

function renderTextEvents(textEvents: TextEvent[]): string {
  if (!textEvents || textEvents.length === 0) return ''
  return '\n' + textEvents.map(renderTextEvent).join('\n')
}

function hasTextEvents(block: IntervalBlock): boolean {
  return block.textEvents && block.textEvents.length > 0
}

function blockTagClose(block: IntervalBlock): string {
  if (hasTextEvents(block)) {
    return `>${renderTextEvents(block.textEvents)}\n        </` + block.type + '>'
  }
  return ' />'
}

function renderWarmup(block: IntervalBlock): string {
  const powerLow = (block.powerLow ?? 0.45).toFixed(2)
  const powerHigh = (block.powerHigh ?? 0.75).toFixed(2)
  const cadence = block.cadence ? ` Cadence="${block.cadence}"` : ''
  const close = blockTagClose(block)
  return `        <Warmup Duration="${block.duration}" PowerLow="${powerLow}" PowerHigh="${powerHigh}"${cadence}${close}`
}

function renderCooldown(block: IntervalBlock): string {
  const powerHigh = (block.powerHigh ?? 0.75).toFixed(2)
  const powerLow = (block.powerLow ?? 0.35).toFixed(2)
  const cadence = block.cadence ? ` Cadence="${block.cadence}"` : ''
  const close = blockTagClose(block)
  return `        <Cooldown Duration="${block.duration}" PowerHigh="${powerHigh}" PowerLow="${powerLow}"${cadence}${close}`
}

function renderSteadyState(block: IntervalBlock): string {
  const power = (block.power ?? 0.75).toFixed(2)
  const cadence = block.cadence ? ` Cadence="${block.cadence}"` : ''
  const close = blockTagClose(block)
  return `        <SteadyState Duration="${block.duration}" Power="${power}"${cadence}${close}`
}

function renderRamp(block: IntervalBlock): string {
  const powerLow = (block.powerLow ?? 0.6).toFixed(2)
  const powerHigh = (block.powerHigh ?? 1.0).toFixed(2)
  const cadence = block.cadence ? ` Cadence="${block.cadence}"` : ''
  const close = blockTagClose(block)
  return `        <Ramp Duration="${block.duration}" PowerLow="${powerLow}" PowerHigh="${powerHigh}"${cadence}${close}`
}

function renderIntervalsT(block: IntervalBlock): string {
  const repeat = block.repeat ?? 1
  const onDuration = block.onDuration ?? 180
  const offDuration = block.offDuration ?? 180
  const onPower = (block.onPower ?? 1.1).toFixed(2)
  const offPower = (block.offPower ?? 0.5).toFixed(2)
  const cadence = block.cadence ? ` Cadence="${block.cadence}"` : ''
  const close = blockTagClose(block)
  return `        <IntervalsT Repeat="${repeat}" OnDuration="${onDuration}" OffDuration="${offDuration}" OnPower="${onPower}" OffPower="${offPower}"${cadence}${close}`
}

function renderBlock(block: IntervalBlock): string {
  switch (block.type) {
    case 'Warmup':       return renderWarmup(block)
    case 'Cooldown':     return renderCooldown(block)
    case 'SteadyState':  return renderSteadyState(block)
    case 'Ramp':         return renderRamp(block)
    case 'IntervalsT':   return renderIntervalsT(block)
    default:
      throw new Error(`Unknown block type: ${(block as IntervalBlock).type}`)
  }
}

export function generateZwo(workout: Workout): string {
  const blocks = workout.textEventsEnabled
    ? workout.blocks
    : workout.blocks.map((b) => ({ ...b, textEvents: [] }))

  const blockXml = blocks.map(renderBlock).join('\n')

  return `<workout_file>
    <author>Workout Builder</author>
    <name>${escapeXml(workout.name)}</name>
    <description>${escapeXml(workout.description)}</description>
    <sportType>bike</sportType>
    <tags></tags>
    <workout>
${blockXml}
    </workout>
</workout_file>`
}
