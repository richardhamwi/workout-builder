'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/coach',    label: 'Coach',    icon: '💬' },
  { href: '/plan',     label: 'Plan',     icon: '📅' },
  { href: '/create',   label: 'Create',   icon: '✏️'  },
  { href: '/library',  label: 'Library',  icon: '📚' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <nav className="hidden md:flex flex-col w-56 min-h-screen bg-zinc-900 border-r border-zinc-800 pt-8 pb-4 px-3 gap-1">
      <div className="px-3 mb-8">
        <h1 className="text-white font-bold text-lg tracking-tight">Workout Builder</h1>
        <p className="text-zinc-500 text-xs mt-0.5">Powered by intervals.icu</p>
      </div>
      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              active
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
