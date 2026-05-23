'use client'

const SUGGESTIONS = [
  'Plan my next week of training',
  'Give me a 45-min sweet spot session',
  "I'm feeling flat — what should I do?",
  'Update my training profile',
]

interface QuickStartSuggestionsProps {
  onSelect: (text: string) => void
}

export function QuickStartSuggestions({ onSelect }: QuickStartSuggestionsProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-center">
        <h2 className="text-lg font-semibold">How can I help you train today?</h2>
        <p className="text-zinc-500 text-sm mt-1">Your fitness data is already loaded.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSelect(s)}
            className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 rounded-xl px-4 py-3 text-left text-sm text-zinc-300 hover:text-white transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
