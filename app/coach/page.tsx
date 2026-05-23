'use client'
import { useState, useEffect } from 'react'
import type { CoachingProfile, AthleteData } from '@/lib/types'
import { OnboardingForm } from '@/components/coach/OnboardingForm'
import { ChatInterface } from '@/components/coach/ChatInterface'

type LoadState = 'loading' | 'onboarding' | 'ready' | 'error'

export default function CoachPage() {
  const [state, setState] = useState<LoadState>('loading')
  const [profile, setProfile] = useState<CoachingProfile | null>(null)
  const [athleteData, setAthleteData] = useState<AthleteData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/profile').then((r) => r.json()),
      fetch('/api/intervals/athlete').then((r) => r.json()),
    ])
      .then(([prof, athlete]) => {
        setAthleteData(athlete)
        if (!prof || !prof.availableDays) {
          setState('onboarding')
        } else {
          setProfile(prof)
          setState('ready')
        }
      })
      .catch((err) => {
        setError(err.message ?? 'Failed to load data')
        setState('error')
      })
  }, [])

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-zinc-500 text-sm">Loading your fitness data...</div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-2">{error}</p>
          <p className="text-zinc-500 text-xs">Check that your INTERVALS_API_KEY and INTERVALS_ATHLETE_ID are set in .env.local</p>
        </div>
      </div>
    )
  }

  if (state === 'onboarding') {
    return (
      <OnboardingForm
        onComplete={(p) => {
          setProfile(p)
          setState('ready')
        }}
      />
    )
  }

  if (!profile || !athleteData) return null

  return (
    <div className="flex flex-col h-screen md:h-[calc(100vh)] overflow-hidden">
      <div className="border-b border-zinc-800 px-4 py-2 flex gap-4 text-xs text-zinc-500 flex-wrap">
        <span>FTP: <span className="text-zinc-300 font-medium">{athleteData.ftp}W</span></span>
        <span>CTL: <span className="text-zinc-300 font-medium">{athleteData.ctl}</span></span>
        <span>ATL: <span className="text-zinc-300 font-medium">{athleteData.atl}</span></span>
        <span>TSB: <span className={`font-medium ${athleteData.tsb >= 0 ? 'text-green-400' : 'text-orange-400'}`}>{athleteData.tsb > 0 ? '+' : ''}{athleteData.tsb}</span></span>
        <span className="ml-auto text-zinc-600">{athleteData.name}</span>
      </div>
      <ChatInterface athleteData={athleteData} profile={profile} />
    </div>
  )
}
