import { describe, expect, it } from 'vitest'
import type { NeedsDecisionRecommendationKnowledge } from '@/domain/recommendations/needsDecision'
import {
  getKnowledgeDisplayDate,
  getKnowledgeSourceLabel,
  getKnowledgeSourceUrl,
  getKnowledgeTypeLabel,
  getPriorityLabel,
  getSourceTypeLabel,
  getVerificationLabel,
  hasWhyAiContent,
  presentText,
  selectKnowledgeDate,
} from './needsDecisionPresentation'

function knowledge(
  overrides: Partial<NeedsDecisionRecommendationKnowledge> = {},
): NeedsDecisionRecommendationKnowledge {
  return {
    id: 'knowledge_1',
    content: 'Office address.',
    type: 'FACT',
    verificationStatus: 'VERIFIED',
    sourceType: 'WEBSITE',
    sourceLabel: null,
    sourceUrl: null,
    obtainedAt: null,
    lastCheckedAt: null,
    ...overrides,
  }
}

describe('needsDecisionPresentation', () => {
  it('maps every Recommendation priority to a distinct RU label', () => {
    expect(getPriorityLabel('LOW')).toBe('Низкий приоритет')
    expect(getPriorityLabel('MEDIUM')).toBe('Средний приоритет')
    expect(getPriorityLabel('HIGH')).toBe('Высокий приоритет')
    expect(getPriorityLabel('CRITICAL')).toBe('Критический приоритет')
  })

  it('maps Knowledge types without mixing FACT, AI_INFERENCE and USER_INFO', () => {
    expect(getKnowledgeTypeLabel('FACT')).toBe('Факт')
    expect(getKnowledgeTypeLabel('OBSERVATION')).toBe('Наблюдение')
    expect(getKnowledgeTypeLabel('AI_INFERENCE')).toBe('Вывод AI')
    expect(getKnowledgeTypeLabel('USER_INFO')).toBe('Информация пользователя')
    expect(getKnowledgeTypeLabel('AI_INFERENCE')).not.toBe(getKnowledgeTypeLabel('FACT'))
    expect(getKnowledgeTypeLabel('USER_INFO')).not.toBe(getKnowledgeTypeLabel('FACT'))
  })

  it('maps every verification status to a distinct RU label', () => {
    expect(getVerificationLabel('VERIFIED')).toBe('Подтверждено')
    expect(getVerificationLabel('NEEDS_VERIFICATION')).toBe('Требует проверки')
    expect(getVerificationLabel('ASSUMPTION')).toBe('Предположение')
    expect(getVerificationLabel('OUTDATED')).toBe('Устарело')
  })

  it('maps every source type to a RU label', () => {
    expect(getSourceTypeLabel('USER')).toBe('Пользователь')
    expect(getSourceTypeLabel('WEBSITE')).toBe('Сайт')
    expect(getSourceTypeLabel('SEARCH')).toBe('Поиск')
    expect(getSourceTypeLabel('IMPORT')).toBe('Импорт')
    expect(getSourceTypeLabel('INTERACTION')).toBe('Взаимодействие')
    expect(getSourceTypeLabel('SYSTEM')).toBe('Система')
    expect(getSourceTypeLabel('OTHER')).toBe('Другой источник')
  })

  it('prefers sourceLabel over sourceType and does not invent a source', () => {
    expect(
      getKnowledgeSourceLabel(
        knowledge({ sourceLabel: 'Official site', sourceType: 'WEBSITE' }),
      ),
    ).toBe('Official site')
    expect(
      getKnowledgeSourceLabel(knowledge({ sourceLabel: null, sourceType: 'SEARCH' })),
    ).toBe('Поиск')
    expect(
      getKnowledgeSourceLabel(knowledge({ sourceLabel: '  ', sourceType: null })),
    ).toBeNull()
    expect(getKnowledgeSourceUrl(knowledge({ sourceUrl: null }))).toBeNull()
    expect(getKnowledgeSourceUrl(knowledge({ sourceUrl: '   ' }))).toBeNull()
  })

  it('allows only absolute http and https source URLs as href', () => {
    expect(getKnowledgeSourceUrl(knowledge({ sourceUrl: 'https://example.com' }))).toBe(
      new URL('https://example.com').href,
    )
    expect(getKnowledgeSourceUrl(knowledge({ sourceUrl: 'http://example.com' }))).toBe(
      new URL('http://example.com').href,
    )
  })

  it('rejects source URLs that are not safe absolute http(s) links', () => {
    expect(getKnowledgeSourceUrl(knowledge({ sourceUrl: 'javascript:alert(1)' }))).toBeNull()
    expect(
      getKnowledgeSourceUrl(knowledge({ sourceUrl: 'data:text/html,<h1>hi</h1>' })),
    ).toBeNull()
    expect(getKnowledgeSourceUrl(knowledge({ sourceUrl: 'file:///etc/passwd' }))).toBeNull()
    expect(
      getKnowledgeSourceUrl(knowledge({ sourceUrl: 'mailto:test@example.com' })),
    ).toBeNull()
    expect(getKnowledgeSourceUrl(knowledge({ sourceUrl: '/example' }))).toBeNull()
    expect(getKnowledgeSourceUrl(knowledge({ sourceUrl: 'example.com' }))).toBeNull()
    expect(getKnowledgeSourceUrl(knowledge({ sourceUrl: '//example.com' }))).toBeNull()
    expect(getKnowledgeSourceUrl(knowledge({ sourceUrl: 'http:example.com' }))).toBeNull()
    expect(getKnowledgeSourceUrl(knowledge({ sourceUrl: 'https:example.com' }))).toBeNull()
    expect(getKnowledgeSourceUrl(knowledge({ sourceUrl: 'http:\\\\example.com' }))).toBeNull()
    expect(getKnowledgeSourceUrl(knowledge({ sourceUrl: 'https:\\\\example.com' }))).toBeNull()
    expect(getKnowledgeSourceUrl(knowledge({ sourceUrl: '' }))).toBeNull()
    expect(getKnowledgeSourceUrl(knowledge({ sourceUrl: '   ' }))).toBeNull()
    expect(getKnowledgeSourceUrl(knowledge({ sourceUrl: 'https://' }))).toBeNull()
  })

  it('prefers lastCheckedAt over obtainedAt for the Knowledge date', () => {
    expect(
      selectKnowledgeDate(
        knowledge({
          lastCheckedAt: '2026-09-18T10:00:00.000Z',
          obtainedAt: '2026-01-01T00:00:00.000Z',
        }),
      ),
    ).toBe('2026-09-18T10:00:00.000Z')
    expect(
      selectKnowledgeDate(
        knowledge({
          lastCheckedAt: null,
          obtainedAt: '2026-01-01T00:00:00.000Z',
        }),
      ),
    ).toBe('2026-01-01T00:00:00.000Z')
    expect(
      selectKnowledgeDate(knowledge({ lastCheckedAt: null, obtainedAt: null })),
    ).toBeNull()
    expect(
      getKnowledgeDisplayDate(knowledge({ lastCheckedAt: 'not-a-date', obtainedAt: null })),
    ).toBeNull()
  })

  it('treats blank reason as absent for the Why-AI disclosure', () => {
    expect(presentText('  ')).toBeNull()
    expect(hasWhyAiContent('', [])).toBe(false)
    expect(hasWhyAiContent('Because hiring started.', [])).toBe(true)
    expect(hasWhyAiContent('', [{}])).toBe(true)
  })
})
