import { describe, expect, it } from 'vitest'
import {
  buildAIProfilePromptSection,
  buildPositioningBlock,
  DEFAULT_AI_PROFILE,
  normalizeAIProfile,
} from './aiProfile'

describe('normalizeAIProfile', () => {
  it('returns defaults for empty input', () => {
    expect(normalizeAIProfile(null)).toEqual(DEFAULT_AI_PROFILE)
  })

  it('keeps provided values', () => {
    expect(
      normalizeAIProfile({
        whoIAm: 'Тест',
        targetAudience: 'B2B',
        advantages: 'Скорость',
      }),
    ).toEqual({
      whoIAm: 'Тест',
      targetAudience: 'B2B',
      advantages: 'Скорость',
    })
  })
})

describe('buildAIProfilePromptSection', () => {
  it('includes positioning fields', () => {
    const prompt = buildAIProfilePromptSection({
      whoIAm: 'Создаю сайты',
      targetAudience: 'Малый бизнес',
      advantages: 'Быстрый запуск',
    })

    expect(prompt).toContain('Кто я: Создаю сайты')
    expect(prompt).toContain('Целевая аудитория: Малый бизнес')
    expect(prompt).toContain('Преимущества: Быстрый запуск')
  })
})

describe('buildPositioningBlock', () => {
  it('joins non-empty fields', () => {
    const block = buildPositioningBlock(DEFAULT_AI_PROFILE)
    expect(block).toContain('Создаю сайты')
    expect(block).toContain('Работаю с:')
    expect(block).toContain('Мои преимущества:')
  })
})
