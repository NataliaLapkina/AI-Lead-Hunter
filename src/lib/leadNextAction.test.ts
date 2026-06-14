import { describe, expect, it } from 'vitest'
import type { Lead } from '@/domain/lead'
import { computeActionRequiredCounts, computeLeadNextAction } from './leadNextAction'

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
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    activityLog: [],
  }
}

describe('computeLeadNextAction', () => {
  it('maps new lead to first message', () => {
    const action = computeLeadNextAction(createLead('new'))
    expect(action.key).toBe('send_first_message')
    expect(action.color).toBe('blue')
    expect(action.recommendedDeadline).toBe('Сегодня')
  })

  it('maps contacted lead to waiting', () => {
    const action = computeLeadNextAction(createLead('contacted'))
    expect(action.key).toBe('wait_for_reply')
    expect(action.color).toBe('yellow')
    expect(action.recommendedDeadline).toBe('3 дня')
  })

  it('maps no_reply to follow up', () => {
    const action = computeLeadNextAction(createLead('no_reply'))
    expect(action.key).toBe('follow_up')
    expect(action.color).toBe('red')
    expect(action.focus).toBe('message')
  })

  it('maps replied to proposal tab', () => {
    const action = computeLeadNextAction(createLead('replied'))
    expect(action.focus).toBe('proposal')
    expect(action.tooltip).toBe('Подготовить КП')
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
