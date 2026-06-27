import { describe, expect, it } from 'vitest'
import type { Lead } from '@/domain/lead'
import { findMatchingLeads } from './leadDuplicates'

const sampleLead = (overrides: Partial<Lead> = {}): Lead => ({
  id: 'lead-1',
  name: 'Demo',
  niche: 'Логопед',
  city: 'Москва',
  source: 'vk',
  website: 'https://demo.example.ru',
  sourceUrl: 'https://vk.com/demo',
  contacts: {
    email: 'hello@demo.example',
    phone: '+7 (900) 111-22-33',
  },
  notes: '',
  status: 'new',
  tags: [],
  opportunities: [],
  comments: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  activityLog: [],
  ...overrides,
})

describe('findMatchingLeads', () => {
  it('matches website, sourceUrl, email and phone', () => {
    const leads = [sampleLead()]

    expect(findMatchingLeads(leads, { website: 'https://www.demo.example.ru/' })).toHaveLength(1)
    expect(findMatchingLeads(leads, { sourceUrl: 'https://vk.com/demo' })).toHaveLength(1)
    expect(findMatchingLeads(leads, { email: 'HELLO@demo.example' })).toHaveLength(1)
    expect(findMatchingLeads(leads, { phone: '8 900 111 22 33' })).toHaveLength(1)
    expect(findMatchingLeads(leads, { phone: '+7 999 000 00 00' })).toHaveLength(0)
  })
})
