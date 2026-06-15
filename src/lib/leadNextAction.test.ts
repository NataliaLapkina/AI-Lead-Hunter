import { describe, expect, it } from 'vitest'
import type { Lead } from '@/domain/lead'
import { computeActionRequiredCounts, computeLeadNextAction } from './leadNextAction'

const referenceDate = new Date('2026-06-01T15:00:00.000Z')

function createLead(status: Lead['status']): Lead {
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
    createdAt: '2026-06-01T08:00:00.000Z',
    updatedAt: '2026-06-01T08:00:00.000Z',
    activityLog: [],
  }
}

describe('computeLeadNextAction', () => {
  it('maps new lead to first message', () => {
    const action = computeLeadNextAction(createLead('new'), referenceDate)
    expect(action.key).toBe('send_first_message')
    expect(action.color).toBe('blue')
    expect(action.recommendedDeadline).toBe('Сегодня')
    expect(action.isOverdue).toBe(false)
  })

  it('maps contacted lead to waiting with future deadline', () => {
    const action = computeLeadNextAction(createLead('contacted'), referenceDate)
    expect(action.key).toBe('wait_for_reply')
    expect(action.color).toBe('yellow')
    expect(action.recommendedDeadline).toMatch(/^До /)
    expect(action.isOverdue).toBe(false)
  })

  it('maps no_reply to follow up', () => {
    const action = computeLeadNextAction(createLead('no_reply'), referenceDate)
    expect(action.key).toBe('follow_up')
    expect(action.color).toBe('red')
    expect(action.focus).toBe('message')
  })

  it('maps replied to proposal tab', () => {
    const action = computeLeadNextAction(createLead('replied'), referenceDate)
    expect(action.focus).toBe('proposal')
    expect(action.tooltip).toContain('Подготовить КП')
  })

  it('marks overdue actions with red color', () => {
    const lead = {
      ...createLead('new'),
      createdAt: '2026-05-28T08:00:00.000Z',
      updatedAt: '2026-05-28T08:00:00.000Z',
    }
    const action = computeLeadNextAction(lead, referenceDate)

    expect(action.isOverdue).toBe(true)
    expect(action.color).toBe('red')
    expect(action.recommendedDeadline).toBe('Просрочено на 4 дня')
  })
})

describe('computeActionRequiredCounts', () => {
  it('counts actionable leads', () => {
    const counts = computeActionRequiredCounts([
      createLead('new'),
      createLead('new'),
      createLead('no_reply'),
      createLead('replied'),
      createLead('contacted'),
    ])

    expect(counts).toEqual({
      new: 2,
      noReply: 1,
      inProgress: 1,
      total: 4,
    })
  })
})
