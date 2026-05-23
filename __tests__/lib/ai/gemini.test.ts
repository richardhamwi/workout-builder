import type { Workout, AthleteData, CoachingProfile, ChatMessage } from '@/lib/types'

// Set up the shared mock model before any imports that use it
const mockGenerateContent = jest.fn()
const mockStartChat = jest.fn()
const mockSendMessage = jest.fn()

jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: mockGenerateContent,
        startChat: mockStartChat,
      }),
    })),
  }
})

// Import after mock is set up
import { GeminiClient } from '@/lib/ai/gemini'

const mockAthlete: AthleteData = {
  id: 1, name: 'Rich', ftp: 280, weight: 72,
  ctl: 65, atl: 70, tsb: -5, recentActivities: [],
}

const mockProfile: CoachingProfile = {
  availableDays: [{ day: 'Tuesday', available: true, maxSessionMinutes: 60 }],
  goals: ['build FTP'],
  constraints: ['time-poor'],
  preferences: ['structured indoors'],
  targetEvents: [],
  updatedAt: '2026-05-23T00:00:00Z',
}

const mockWorkout: Workout = {
  name: 'Test Workout',
  description: 'desc',
  sportType: 'bike',
  durationSeconds: 3600,
  textEventsEnabled: true,
  blocks: [
    { id: 'b1', type: 'SteadyState', duration: 600, power: 0.88, textEvents: [] },
  ],
}

beforeEach(() => {
  process.env.GEMINI_API_KEY = 'test-key'
  jest.clearAllMocks()
})

describe('GeminiClient.generateWorkout', () => {
  it('parses JSON response into Workout', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(mockWorkout) },
    })

    const client = new GeminiClient()
    const result = await client.generateWorkout('45 min sweet spot', mockAthlete, mockProfile)

    expect(result.name).toBe('Test Workout')
    expect(result.sportType).toBe('bike')
  })

  it('handles JSON wrapped in markdown code fences', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => '```json\n' + JSON.stringify(mockWorkout) + '\n```' },
    })

    const client = new GeminiClient()
    const result = await client.generateWorkout('test', mockAthlete, mockProfile)
    expect(result.name).toBe('Test Workout')
  })
})

describe('GeminiClient.generateTextEvents', () => {
  it('returns array-of-arrays matching block count', async () => {
    const fakeEvents = [[{ id: 'te1', message: 'Push now', timeOffset: 0, duration: 10, category: 'motivation' }]]
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(fakeEvents) },
    })

    const client = new GeminiClient()
    const result = await client.generateTextEvents(mockWorkout)

    expect(Array.isArray(result)).toBe(true)
    expect(result[0][0].category).toBe('motivation')
  })
})

describe('GeminiClient.chat', () => {
  it('calls sendMessage and returns response text', async () => {
    mockSendMessage.mockResolvedValueOnce({
      response: { text: () => 'Here is your plan...' },
    })
    mockStartChat.mockReturnValueOnce({ sendMessage: mockSendMessage })

    const messages: ChatMessage[] = [
      { id: '1', role: 'user', content: 'Plan my week', timestamp: '2026-05-23T00:00:00Z' },
    ]

    const client = new GeminiClient()
    const result = await client.chat(messages, 'You are a coach')

    expect(result).toBe('Here is your plan...')
    expect(mockSendMessage).toHaveBeenCalledWith('Plan my week')
  })
})
