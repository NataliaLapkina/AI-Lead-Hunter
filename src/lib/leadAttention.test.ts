import { describe, expect, it } from 'vitest'
import type { Lead } from '@/domain/lead'
import {
  computeLeadsRequiringAttention,
  countLeadsRequiringAttention,
  filterOverdueLeads,
  sortLeadsByOverdueDays,
} from './leadAttention'

const referenceDate = new Date('2026-06-01T15:00:00.000Z')

function createLead(
  id: string,
  status: Lead['status'],
  options: {
    name?: string
    createdAt?: string
    updatedAt?: string
  } = {},
): Lead {
  const createdAt = options.createdAt ?? '2026-06-01T08:00:00.000Z'
  const updatedAt = options.updatedAt ?? createdAt

  return {
    id,
    name: options.name ?? `Лид ${id}`,
    niche: 'Логопед',
    city: 'Москва',
    source: 'avito',
    contacts: {},
    notes: '',
    tags: [],
    opportunities: [],
    comments: [],
    status,
    createdAt,
    updatedAt,
    activityLog: [],
  }
}

describe('computeLeadsRequiringAttention', () => {
  it('returns only overdue leads', () => {
    const items = computeLeadsRequiringAttention(
      [
        createLead('1', 'new', {
          createdAt: '2026-06-01T08:00:00.000Z',
          updatedAt: '2026-06-01T08:00:00.000Z',
        }),
        createLead('2', 'new', {
          createdAt: '2026-05-20T08:00:00.000Z',
          updatedAt: '2026-05-20T08:00:00.000Z',
        }),
        createLead('3', 'won'),
      ],
      { referenceDate },
    )

    expect(items).toHaveLength(1)
    expect(items[0].lead.id).toBe('2')
    expect(items[0].action.isOverdue).toBe(true)
  })

  it('sorts by overdueDays descending', () => {
    const items = computeLeadsRequiringAttention(
      [
        createLead('1', 'new', {
          createdAt: '2026-05-28T08:00:00.000Z',
          updatedAt: '2026-05-28T08:00:00.000Z',
        }),
        createLead('2', 'new', {
          createdAt: '2026-05-20T08:00:00.000Z',
          updatedAt: '2026-05-20T08:00:00.000Z',
        }),
      ],
      { referenceDate },
    )

    expect(items.map((item) => item.lead.id)).toEqual(['2', '1'])
    expect(items[0].action.overdueDays).toBeGreaterThan(items[1].action.overdueDays)
  })

  it('limits results to 5 leads by default', () => {
    const leads = Array.from({ length: 7 }, (_, index) =>
      createLead(String(index), 'new', {
        createdAt: `2026-05-${String(index + 1).padStart(2, '0')}T08:00:00.000Z`,
        updatedAt: `2026-05-${String(index + 1).padStart(2, '0')}T08:00:00.000Z`,
      }),
    )

    expect(computeLeadsRequiringAttention(leads, { referenceDate })).toHaveLength(5)
  })

  it('returns empty array when no overdue leads', () => {
    const items = computeLeadsRequiringAttention(
      [createLead('1', 'new'), createLead('2', 'won')],
      { referenceDate },
    )

    expect(items).toEqual([])
  })
})

describe('countLeadsRequiringAttention', () => {
  it('counts overdue leads', () => {
    const count = countLeadsRequiringAttention(
      [
        createLead('1', 'new', {
          createdAt: '2026-05-20T08:00:00.000Z',
          updatedAt: '2026-05-20T08:00:00.000Z',
        }),
        createLead('2', 'new'),
        createLead('3', 'archived'),
      ],
      referenceDate,
    )

    expect(count).toBe(1)
  })
})

describe('filterOverdueLeads', () => {
  it('returns only overdue leads', () => {
    const overdue = filterOverdueLeads(
      [
        createLead('1', 'new'),
        createLead('2', 'new', {
          createdAt: '2026-05-20T08:00:00.000Z',
          updatedAt: '2026-05-20T08:00:00.000Z',
        }),
      ],
      referenceDate,
    )

    expect(overdue).toHaveLength(1)
    expect(overdue[0].id).toBe('2')
  })
})

describe('sortLeadsByOverdueDays', () => {
  it('sorts overdue leads by overdueDays descending', () => {
    const sorted = sortLeadsByOverdueDays(
      [
        createLead('1', 'new', {
          createdAt: '2026-05-28T08:00:00.000Z',
          updatedAt: '2026-05-28T08:00:00.000Z',
        }),
        createLead('2', 'new', {
          createdAt: '2026-05-20T08:00:00.000Z',
          updatedAt: '2026-05-20T08:00:00.000Z',
        }),
      ],
      referenceDate,
    )

    expect(sorted.map((lead) => lead.id)).toEqual(['2', '1'])
  })
})
