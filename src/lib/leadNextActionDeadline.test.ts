import { describe, expect, it } from 'vitest'
import type { Lead, LeadActivity } from '@/domain/lead'
import {
  computeNextActionDeadline,
  getStatusEnteredAt,
} from './leadNextActionDeadline'

function createLead(
  status: Lead['status'],
  options: {
    createdAt?: string
    updatedAt?: string
    activityLog?: LeadActivity[]
  } = {},
): Lead {
  const createdAt = options.createdAt ?? '2026-06-01T10:00:00.000Z'
  const updatedAt = options.updatedAt ?? createdAt

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
    status,
    createdAt,
    updatedAt,
    activityLog: options.activityLog ?? [],
  }
}

describe('getStatusEnteredAt', () => {
  it('uses latest status_change matching current status', () => {
    const lead = createLead('contacted', {
      activityLog: [
        {
          id: '1',
          type: 'status_change',
          timestamp: '2026-06-01T10:00:00.000Z',
          payload: { from: 'new', to: 'contacted' },
        },
        {
          id: '2',
          type: 'status_change',
          timestamp: '2026-06-10T10:00:00.000Z',
          payload: { from: 'no_reply', to: 'contacted' },
        },
      ],
    })

    expect(getStatusEnteredAt(lead).toISOString()).toBe(
      '2026-06-10T10:00:00.000Z',
    )
  })

  it('falls back to updatedAt then createdAt', () => {
    const lead = createLead('new', {
      createdAt: '2026-06-01T10:00:00.000Z',
      updatedAt: '2026-06-05T10:00:00.000Z',
      activityLog: [],
    })

    expect(getStatusEnteredAt(lead).toISOString()).toBe(
      '2026-06-05T10:00:00.000Z',
    )
  })
})

describe('computeNextActionDeadline', () => {
  const ref = new Date('2026-06-01T15:00:00.000Z')

  it('returns Сегодня for same-day zero-day SLA', () => {
    const lead = createLead('new', {
      createdAt: '2026-06-01T08:00:00.000Z',
      updatedAt: '2026-06-01T08:00:00.000Z',
    })

    const deadline = computeNextActionDeadline(lead, 'send_first_message', ref)

    expect(deadline.recommendedDeadline).toBe('Сегодня')
    expect(deadline.isOverdue).toBe(false)
    expect(deadline.overdueDays).toBe(0)
    expect(deadline.dueAt).not.toBeNull()
  })

  it('returns overdue for zero-day SLA on previous day', () => {
    const lead = createLead('new', {
      createdAt: '2026-05-30T08:00:00.000Z',
      updatedAt: '2026-05-30T08:00:00.000Z',
    })

    const deadline = computeNextActionDeadline(lead, 'send_first_message', ref)

    expect(deadline.isOverdue).toBe(true)
    expect(deadline.overdueDays).toBe(2)
    expect(deadline.recommendedDeadline).toBe('Просрочено на 2 дня')
  })

  it('returns До <date> for future wait_for_reply deadline', () => {
    const lead = createLead('contacted', {
      activityLog: [
        {
          id: '1',
          type: 'status_change',
          timestamp: '2026-06-01T08:00:00.000Z',
          payload: { from: 'new', to: 'contacted' },
        },
      ],
    })

    const deadline = computeNextActionDeadline(lead, 'wait_for_reply', ref)

    expect(deadline.recommendedDeadline).toBe('До 4 июн. 2026 г.')
    expect(deadline.isOverdue).toBe(false)
  })

  it('returns null deadline for actions without SLA', () => {
    const lead = createLead('won')

    const deadline = computeNextActionDeadline(lead, 'request_review', ref)

    expect(deadline.dueAt).toBeNull()
    expect(deadline.recommendedDeadline).toBeNull()
    expect(deadline.isOverdue).toBe(false)
  })

  it('applies 7-day SLA for follow_up', () => {
    const lead = createLead('no_reply', {
      activityLog: [
        {
          id: '1',
          type: 'status_change',
          timestamp: '2026-05-20T08:00:00.000Z',
          payload: { from: 'contacted', to: 'no_reply' },
        },
      ],
    })

    const deadline = computeNextActionDeadline(lead, 'follow_up', ref)

    expect(deadline.isOverdue).toBe(true)
    expect(deadline.overdueDays).toBe(5)
    expect(deadline.recommendedDeadline).toBe('Просрочено на 5 дней')
  })
})
