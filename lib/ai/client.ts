export type { AIClient } from '@/lib/types'

import { GeminiClient } from './gemini'

export function createAIClient() {
  return new GeminiClient()
}
