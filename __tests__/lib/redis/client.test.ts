import type { CoachingProfile, TrainingPlan } from '@/lib/types'

const mockGet = jest.fn()
const mockSet = jest.fn()
const mockSadd = jest.fn()
const mockSmembers = jest.fn()
const mockSrem = jest.fn()
const mockDel = jest.fn()

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: mockGet,
    set: mockSet,
    sadd: mockSadd,
    smembers: mockSmembers,
    srem: mockSrem,
    del: mockDel,
  })),
}))

import { getProfile, setProfile, getPlanDraft, setPlanDraft, listPlanDrafts, deletePlanDraft } from '@/lib/redis/client'

beforeEach(() => {
  jest.clearAllMocks()
  process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
})

const mockProfile: CoachingProfile = {
  availableDays: [{ day: 'Tuesday', available: true, maxSessionMinutes: 60 }],
  goals: ['build FTP'],
  constraints: [],
  preferences: [],
  targetEvents: [],
  updatedAt: '2026-05-23T00:00:00Z',
}

const mockPlan: TrainingPlan = {
  id: 'plan-1',
  name: '8-week FTP Builder',
  description: 'Build FTP over 8 weeks',
  startDate: '2026-06-01',
  weeks: [],
  createdAt: '2026-05-23T00:00:00Z',
}

describe('getProfile', () => {
  it('returns null when profile not set', async () => {
    mockGet.mockResolvedValueOnce(null)
    const result = await getProfile()
    expect(result).toBeNull()
  })

  it('returns coaching profile', async () => {
    mockGet.mockResolvedValueOnce(mockProfile)
    const result = await getProfile()
    expect(result?.goals).toContain('build FTP')
  })
})

describe('setProfile', () => {
  it('stores profile at correct key', async () => {
    mockSet.mockResolvedValueOnce('OK')
    await setProfile(mockProfile)
    expect(mockSet).toHaveBeenCalledWith('coaching:profile', mockProfile)
  })
})

describe('getPlanDraft / setPlanDraft', () => {
  it('stores and retrieves plan draft', async () => {
    mockSet.mockResolvedValueOnce('OK')
    mockSadd.mockResolvedValueOnce(1)
    await setPlanDraft('plan-1', mockPlan)
    expect(mockSet).toHaveBeenCalledWith('plan:plan-1', mockPlan)
    expect(mockSadd).toHaveBeenCalledWith('plan:index', 'plan-1')

    mockGet.mockResolvedValueOnce(mockPlan)
    const result = await getPlanDraft('plan-1')
    expect(result?.name).toBe('8-week FTP Builder')
  })
})

describe('listPlanDrafts', () => {
  it('returns empty array when no plans', async () => {
    mockSmembers.mockResolvedValueOnce([])
    const result = await listPlanDrafts()
    expect(result).toEqual([])
  })

  it('fetches all plans by id', async () => {
    mockSmembers.mockResolvedValueOnce(['plan-1', 'plan-2'])
    mockGet.mockResolvedValueOnce(mockPlan).mockResolvedValueOnce(null)
    const result = await listPlanDrafts()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('plan-1')
  })
})

describe('deletePlanDraft', () => {
  it('removes plan from store and index', async () => {
    mockDel.mockResolvedValueOnce(1)
    mockSrem.mockResolvedValueOnce(1)
    await deletePlanDraft('plan-1')
    expect(mockDel).toHaveBeenCalledWith('plan:plan-1')
    expect(mockSrem).toHaveBeenCalledWith('plan:index', 'plan-1')
  })
})
