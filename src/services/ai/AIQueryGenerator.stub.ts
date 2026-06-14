import type { SearchQuery } from '@/domain/lead'

export interface AIQueryGeneratorInput {
  niche: string
  city?: string
  source?: string
}

export interface IAIQueryGenerator {
  generate(input: AIQueryGeneratorInput): Promise<SearchQuery[]>
  isAvailable(): boolean
}

export class AIQueryGeneratorStub implements IAIQueryGenerator {
  async generate(): Promise<SearchQuery[]> {
    throw new Error('AI query generator is not available in MVP 1.0')
  }

  isAvailable(): boolean {
    return false
  }
}

export const aiQueryGenerator: IAIQueryGenerator = new AIQueryGeneratorStub()
