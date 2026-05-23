import { redirect } from 'next/navigation'

export default async function Home() {
  let allOk = false
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/health`, { cache: 'no-store' })
    const data = await res.json()
    allOk = data.redis && data.gemini && data.intervals
  } catch {
    allOk = false
  }

  if (!allOk) redirect('/setup')
  redirect('/coach')
}
