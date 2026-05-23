'use client'

export type WorkoutType = 'All' | 'Sweet Spot' | 'VO2 Max' | 'Tempo' | 'Recovery' | 'Endurance'
export type DurationFilter = 'All' | '30' | '45' | '60' | '90+'

interface FilterBarProps {
  search: string
  onSearchChange: (v: string) => void
  type: WorkoutType
  onTypeChange: (v: WorkoutType) => void
  duration: DurationFilter
  onDurationChange: (v: DurationFilter) => void
}

const TYPES: WorkoutType[] = ['All', 'Sweet Spot', 'VO2 Max', 'Tempo', 'Recovery', 'Endurance']
const DURATIONS: DurationFilter[] = ['All', '30', '45', '60', '90+']

export function FilterBar({ search, onSearchChange, type, onTypeChange, duration, onDurationChange }: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 mb-6">
      <input
        type="search"
        placeholder="Search workouts..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 w-full"
      />
      <div className="flex gap-2 flex-wrap">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => onTypeChange(t)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              type === t ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {DURATIONS.map((d) => (
          <button
            key={d}
            onClick={() => onDurationChange(d)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              duration === d ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {d === 'All' ? 'Any length' : `${d} min`}
          </button>
        ))}
      </div>
    </div>
  )
}
