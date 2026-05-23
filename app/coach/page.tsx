'use client'
import { useState, useEffect } from 'react'
import type { CoachingProfile } from '@/lib/types'
import { OnboardingForm } from '@/components/coach/OnboardingForm'

export default function CoachPage() {
  const [profile, setProfile] = useState<CoachingProfile | null | 'loading'>('loading')

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data) => setProfile(data ?? null))
      .catch(() => setProfile(null))
  }, [])

  if (profile === 'loading') {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <div className="text-zinc-500 text-sm">Loading...</div>
      </div>
    )
  }

  if (!profile) {
    return <OnboardingForm onComplete={(p) => setProfile(p)} />
  }

  // Full chat UI added in Task 16
  return (
    <div className="flex items-center justify-center h-full min-h-[50vh]">
      <div className="text-zinc-500 text-sm">Coach UI — Task 16</div>
    </div>
  )
}
