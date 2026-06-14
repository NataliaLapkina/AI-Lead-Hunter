import { describe, expect, it } from 'vitest'
import type { Lead } from '@/domain/lead'
import { computeLeadScore, getLeadPotentialLevel } from './leadScore'

function createLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'lead-1',
    name: 'Тест',
    niche: 'Логопед',
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

describe('computeLeadScore', () => {
  it('caps score at 10', () => {
    const result = computeLeadScore(
      createLead({
        opportunities: ['no_booking_form', 'no_online_booking'],
        contacts: {
          phone: '+7 900 000-00-00',
          telegram: '@test',
          vk: 'vk.com/test',
          email: 'test@example.com',
        },
        sourceUrl: 'https://avito.ru/item/1',
      }),
    )

    expect(result.score).toBeLessThanOrEqual(10)
  })

  it('scores outreach contacts and growth gaps', () => {
    const result = computeLeadScore(
      createLead({
        opportunities: ['no_booking_form', 'no_online_booking'],
        contacts: {
          phone: '+7 900 000-00-00',
          telegram: '@test',
        },
        sourceUrl: 'https://avito.ru/item/1',
      }),
    )

    expect(result.score).toBeGreaterThanOrEqual(7)
    expect(result.level).toBe('high')
    expect(result.reasons).toContain('нет сайта')
    expect(result.reasons).toContain('есть WhatsApp')
    expect(result.reasons).toContain('есть несколько точек роста')
  })

  it('returns low level for empty lead', () => {
    const result = computeLeadScore(createLead())
    expect(result.level).toBe('low')
    expect(result.reasons).toContain('нет сайта')
  })
})

describe('getLeadPotentialLevel', () => {
  it('maps score ranges', () => {
    expect(getLeadPotentialLevel(3)).toBe('low')
    expect(getLeadPotentialLevel(4)).toBe('medium')
    expect(getLeadPotentialLevel(7)).toBe('high')
  })
})
