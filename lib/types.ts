// lib/types.ts

export type BlockType = 'Warmup' | 'SteadyState' | 'IntervalsT' | 'Ramp' | 'Cooldown'
export type TextEventCategory = 'physiology' | 'motivation' | 'technique' | 'pacing' | 'recovery' | 'nutrition'
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'

export interface TextEvent {
  id: string
  message: string
  timeOffset: number   // seconds from start of block
  duration: number     // seconds to display (default 10)
  category: TextEventCategory
}

export interface IntervalBlock {
  id: string
  type: BlockType
  duration: number     // total seconds
  power?: number       // fraction of FTP (SteadyState)
  powerLow?: number    // ramp start (Warmup/Cooldown/Ramp)
  powerHigh?: number   // ramp end
  cadence?: number
  repeat?: number      // IntervalsT
  onDuration?: number  // IntervalsT on-interval seconds
  offDuration?: number // IntervalsT off-interval seconds
  onPower?: number     // IntervalsT on-interval power (fraction of FTP)
  offPower?: number    // IntervalsT off-interval power (fraction of FTP)
  textEvents: TextEvent[]
}

export interface Workout {
  id?: string
  name: string
  description: string
  sportType: 'bike'
  durationSeconds: number
  blocks: IntervalBlock[]
  textEventsEnabled: boolean
}

export interface Activity {
  id: number
  name: string
  date: string
  type: string
  durationSeconds: number
  tss: number
  averageHR?: number
}

export interface AthleteData {
  id: number
  name: string
  ftp: number
  weight: number
  ctl: number
  atl: number
  tsb: number
  recentActivities: Activity[]
}

export interface DaySchedule {
  day: DayOfWeek
  available: boolean
  maxSessionMinutes: number
}

export interface CoachingProfile {
  availableDays: DaySchedule[]
  goals: string[]
  constraints: string[]
  preferences: string[]
  targetEvents: string[]
  updatedAt: string
}

export interface PlanSession {
  id: string
  date: string
  workoutId: string | null
  workoutName: string | null
  notes?: string
}

export interface PlanWeek {
  weekNumber: number
  focus: string
  sessions: PlanSession[]
}

export interface TrainingPlan {
  id: string
  name: string
  description: string
  startDate: string
  weeks: PlanWeek[]
  createdAt: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  attachedWorkout?: Workout
  attachedPlan?: TrainingPlan
}

export interface AIClient {
  chat(messages: ChatMessage[], systemPrompt: string): Promise<string>
  generateWorkout(prompt: string, athleteData: AthleteData, profile: CoachingProfile): Promise<Workout>
  generatePlan(prompt: string, athleteData: AthleteData, profile: CoachingProfile): Promise<TrainingPlan>
  generateTextEvents(workout: Workout): Promise<TextEvent[][]>
}
