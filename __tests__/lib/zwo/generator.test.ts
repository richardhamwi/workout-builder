import { generateZwo } from '@/lib/zwo/generator'
import type { Workout, IntervalBlock } from '@/lib/types'

function makeWorkout(blocks: IntervalBlock[]): Workout {
  return {
    name: 'Test Workout',
    description: 'A test',
    sportType: 'bike',
    durationSeconds: blocks.reduce((sum, b) => sum + b.duration, 0),
    blocks,
    textEventsEnabled: true,
  }
}

describe('generateZwo', () => {
  it('generates valid XML root element', () => {
    const xml = generateZwo(makeWorkout([]))
    expect(xml).toContain('<workout_file>')
    expect(xml).toContain('</workout_file>')
    expect(xml).toContain('<name>Test Workout</name>')
    expect(xml).toContain('<sportType>bike</sportType>')
  })

  it('renders Warmup block correctly', () => {
    const block: IntervalBlock = {
      id: 'b1', type: 'Warmup', duration: 600,
      powerLow: 0.45, powerHigh: 0.75, textEvents: [],
    }
    const xml = generateZwo(makeWorkout([block]))
    expect(xml).toContain('<Warmup Duration="600" PowerLow="0.45" PowerHigh="0.75"')
  })

  it('renders Cooldown block correctly', () => {
    const block: IntervalBlock = {
      id: 'b1', type: 'Cooldown', duration: 300,
      powerHigh: 0.75, powerLow: 0.35, textEvents: [],
    }
    const xml = generateZwo(makeWorkout([block]))
    expect(xml).toContain('<Cooldown Duration="300" PowerHigh="0.75" PowerLow="0.35"')
  })

  it('renders SteadyState block correctly', () => {
    const block: IntervalBlock = {
      id: 'b1', type: 'SteadyState', duration: 600,
      power: 0.88, cadence: 90, textEvents: [],
    }
    const xml = generateZwo(makeWorkout([block]))
    expect(xml).toContain('<SteadyState Duration="600" Power="0.88" Cadence="90"')
  })

  it('renders Ramp block correctly', () => {
    const block: IntervalBlock = {
      id: 'b1', type: 'Ramp', duration: 1200,
      powerLow: 0.60, powerHigh: 1.00, textEvents: [],
    }
    const xml = generateZwo(makeWorkout([block]))
    expect(xml).toContain('<Ramp Duration="1200" PowerLow="0.60" PowerHigh="1.00"')
  })

  it('renders IntervalsT block correctly', () => {
    const block: IntervalBlock = {
      id: 'b1', type: 'IntervalsT', duration: 1800,
      repeat: 5, onDuration: 180, offDuration: 180,
      onPower: 1.10, offPower: 0.55, textEvents: [],
    }
    const xml = generateZwo(makeWorkout([block]))
    expect(xml).toContain(
      '<IntervalsT Repeat="5" OnDuration="180" OffDuration="180" OnPower="1.10" OffPower="0.55"'
    )
  })

  it('embeds textevents inside block tags', () => {
    const block: IntervalBlock = {
      id: 'b1', type: 'SteadyState', duration: 600, power: 0.88,
      textEvents: [
        { id: 'te1', message: 'Push now', timeOffset: 0, duration: 10, category: 'motivation' },
        { id: 'te2', message: 'Halfway', timeOffset: 300, duration: 10, category: 'physiology' },
      ],
    }
    const xml = generateZwo(makeWorkout([block]))
    expect(xml).toContain('<textevent timeoffset="0" message="Push now" duration="10"/>')
    expect(xml).toContain('<textevent timeoffset="300" message="Halfway" duration="10"/>')
    expect(xml).toContain('</SteadyState>')
    expect(xml).not.toContain('<SteadyState Duration="600" Power="0.88" />')
  })

  it('omits textevents when textEventsEnabled is false', () => {
    const block: IntervalBlock = {
      id: 'b1', type: 'SteadyState', duration: 600, power: 0.88,
      textEvents: [{ id: 'te1', message: 'Push', timeOffset: 0, duration: 10, category: 'motivation' }],
    }
    const workout = makeWorkout([block])
    workout.textEventsEnabled = false
    const xml = generateZwo(workout)
    expect(xml).not.toContain('<textevent')
    expect(xml).toContain('<SteadyState Duration="600" Power="0.88" />')
  })

  it('escapes special characters in name and description', () => {
    const workout = makeWorkout([])
    workout.name = 'Rich & Fast <Intervals>'
    workout.description = 'Use "max" effort'
    const xml = generateZwo(workout)
    expect(xml).toContain('<name>Rich &amp; Fast &lt;Intervals&gt;</name>')
    expect(xml).toContain('<description>Use &quot;max&quot; effort</description>')
  })
})
