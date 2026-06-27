import { describe, expect, it } from 'vitest'
import type { SearchQuery } from '@/domain/lead'
import { buildCreateLeadInputFromManualSearch } from './buildLeadFromManualSearch'

const baseQuery: SearchQuery = {
  id: 'q1',
  niche: 'Логопед',
  city: 'Москва',
  source: 'vk',
  query: 'логопед Москва vk',
  platform: 'vk',
  createdAt: '2026-01-01T00:00:00.000Z',
}

describe('buildCreateLeadInputFromManualSearch', () => {
  it('creates lead from query metadata without found text', () => {
    const result = buildCreateLeadInputFromManualSearch(baseQuery)
    expect(result).not.toBeNull()
    expect(result?.input.name).toBe('Компания из VK')
    expect(result?.input.niche).toBe('Логопед')
    expect(result?.input.city).toBe('Москва')
    expect(result?.input.source).toBe('vk')
    expect(result?.input.status).toBe('new')
    expect(result?.input.notes).toContain('логопед Москва vk')
    expect(result?.input.tags).toContain('ручной-поиск')
  })

  it('maps found website and keeps name clean', () => {
    const result = buildCreateLeadInputFromManualSearch(
      baseQuery,
      'Студия «Говорун»\nhttps://demo-govorun.example.ru\n+7 (900) 111-22-33',
    )

    expect(result?.input.name).toBe('Студия «Говорун»')
    expect(result?.input.website).toBe('https://demo-govorun.example.ru')
    expect(result?.input.contacts.phone).toBe('+7 (900) 111-22-33')
    expect(result?.siteAudit?.url).toBe('https://demo-govorun.example.ru')
  })

  it('returns null when niche is empty', () => {
    expect(
      buildCreateLeadInputFromManualSearch({
        ...baseQuery,
        niche: '   ',
      }),
    ).toBeNull()
  })
})
