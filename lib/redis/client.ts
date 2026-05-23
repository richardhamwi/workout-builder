import { Redis } from '@upstash/redis'
import type { CoachingProfile, TrainingPlan } from '@/lib/types'

function getRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set')
  }
  return new Redis({ url, token })
}

const PROFILE_KEY = 'coaching:profile'
const PLAN_KEY_PREFIX = 'plan:'
const PLAN_INDEX_KEY = 'plan:index'

export async function getProfile(): Promise<CoachingProfile | null> {
  const redis = getRedis()
  return redis.get<CoachingProfile>(PROFILE_KEY)
}

export async function setProfile(profile: CoachingProfile): Promise<void> {
  const redis = getRedis()
  await redis.set(PROFILE_KEY, profile)
}

export async function getPlanDraft(id: string): Promise<TrainingPlan | null> {
  const redis = getRedis()
  return redis.get<TrainingPlan>(`${PLAN_KEY_PREFIX}${id}`)
}

export async function setPlanDraft(id: string, plan: TrainingPlan): Promise<void> {
  const redis = getRedis()
  await Promise.all([
    redis.set(`${PLAN_KEY_PREFIX}${id}`, plan),
    redis.sadd(PLAN_INDEX_KEY, id),
  ])
}

export async function listPlanDrafts(): Promise<TrainingPlan[]> {
  const redis = getRedis()
  const ids = await redis.smembers(PLAN_INDEX_KEY)
  if (!ids || ids.length === 0) return []

  const plans = await Promise.all(
    (ids as string[]).map((id) => redis.get<TrainingPlan>(`${PLAN_KEY_PREFIX}${id}`))
  )
  return plans.filter((p): p is TrainingPlan => p !== null)
}

export async function deletePlanDraft(id: string): Promise<void> {
  const redis = getRedis()
  await Promise.all([
    redis.del(`${PLAN_KEY_PREFIX}${id}`),
    redis.srem(PLAN_INDEX_KEY, id),
  ])
}
