import { describe, expect, it } from 'vitest'
import {
  MOCK_USER_PROFILE,
  buildEmailSubject,
  buildMockEmail,
} from './dashboardMvpMock'

describe('buildEmailSubject', () => {
  it('returns localized Russian subject', () => {
    expect(buildEmailSubject('Мебель Про', 'ru')).toBe(
      'Идея по развитию сайта компании «Мебель Про»',
    )
  })

  it('returns localized English subject', () => {
    expect(buildEmailSubject('Acme Studio', 'en')).toBe('Website growth idea for Acme Studio')
  })
})

describe('buildMockEmail', () => {
  it('generates a Russian business email from user profile', () => {
    const { draft, subject } = buildMockEmail({
      language: 'ru',
      niche: 'мебель',
      company: 'Мебель Про',
      userProfile: MOCK_USER_PROFILE,
    })

    expect(subject).toContain('Мебель Про')
    expect(draft).toContain('Здравствуйте!')
    expect(draft).toContain('Наталья Лапкина')
    expect(draft).toContain('AI & Digital Products')
    expect(draft).toContain('С уважением,')
    expect(draft).toContain('каталог')
    expect(draft).not.toMatch(/Alex|Hi there|Best,/i)
  })

  it('generates an English business email from user profile', () => {
    const { draft, subject } = buildMockEmail({
      language: 'en',
      niche: 'marketing agency',
      company: 'Acme Studio',
      userProfile: MOCK_USER_PROFILE,
    })

    expect(subject).toBe('Website growth idea for Acme Studio')
    expect(draft).toContain('Hello!')
    expect(draft).toContain('Natalia Lapkina')
    expect(draft).toContain('Best regards,')
    expect(draft).toContain('funnel')
    expect(draft).not.toMatch(/Alex|Hi there|Здравствуйте|С уважением/i)
  })

  it('adapts copy for lawyer niche in Russian', () => {
    const { draft } = buildMockEmail({
      language: 'ru',
      niche: 'юрист',
      company: 'Право и Защита',
      userProfile: MOCK_USER_PROFILE,
    })

    expect(draft).toContain('доверие')
    expect(draft).toContain('юридических услуг')
  })

  it('adapts copy for speech therapy niche in English', () => {
    const { draft } = buildMockEmail({
      language: 'en',
      niche: 'speech therapist',
      company: 'Clear Speech',
      userProfile: MOCK_USER_PROFILE,
    })

    expect(draft).toContain('consultation booking')
    expect(draft).toContain('parent trust')
  })
})
