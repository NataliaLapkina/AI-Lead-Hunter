import { describe, expect, it } from 'vitest'
import type { Lead } from '@/domain/lead'
import { isPlaceholderLeadName } from '@/lib/leadLinks'
import { buildOutreachMessage, formatOutreachCompanyPhrase } from './outreachMessage'

function createTestLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'test-lead',
    name: 'Тестовая компания',
    niche: 'Нутрициолог',
    city: 'Москва',
    source: 'avito',
    contacts: {},
    notes: '',
    tags: [],
    opportunities: [],
    comments: [],
    status: 'new',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    activityLog: [],
    ...overrides,
  }
}

describe('isPlaceholderLeadName', () => {
  it('detects Item placeholders', () => {
    expect(isPlaceholderLeadName('Item 100000')).toBe(true)
    expect(isPlaceholderLeadName('Item 123456')).toBe(true)
    expect(isPlaceholderLeadName('item 999')).toBe(true)
  })

  it('detects URLs and empty values', () => {
    expect(isPlaceholderLeadName('https://vk.com/example')).toBe(true)
    expect(isPlaceholderLeadName('vk.com/example')).toBe(true)
    expect(isPlaceholderLeadName('')).toBe(true)
    expect(isPlaceholderLeadName('   ')).toBe(true)
    expect(isPlaceholderLeadName(undefined)).toBe(true)
  })

  it('allows normalized names', () => {
    expect(isPlaceholderLeadName('Нутрициолог из Авито')).toBe(false)
    expect(isPlaceholderLeadName('Студия красоты «Лилия»')).toBe(false)
  })
})

describe('buildOutreachMessage', () => {
  it('does not include Item placeholder in the final text', () => {
    const message = buildOutreachMessage(
      createTestLead({
        name: 'Item 100000',
        source: 'avito',
        sourceUrl: 'https://www.avito.ru/moscow/nutritionist/item_100000',
      }),
    )

    expect(message).not.toContain('Item 100000')
    expect(message).toContain('Нутрициолог из Авито')
  })

  it('omits company name when only placeholder is available', () => {
    const phrase = formatOutreachCompanyPhrase(
      createTestLead({
        name: '',
        source: 'other',
      }),
    )

    expect(phrase).toBe('Изучила вашу компанию и заметила несколько точек роста:')
    expect(phrase).not.toContain('«')
  })
})
