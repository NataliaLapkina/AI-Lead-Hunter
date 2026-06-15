import { describe, expect, it } from 'vitest'
import type { Lead } from '@/domain/lead'
import {
  buildRegeneratedMessageUpdate,
  buildRestoreMessageUpdate,
  MAX_LEAD_MESSAGE_HISTORY,
  pushMessageToHistory,
} from './leadMessageHistory'

function createLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'lead-1',
    name: 'Тест',
    niche: 'Косметолог',
    city: 'Москва',
    source: 'avito',
    contacts: {},
    notes: '',
    tags: [],
    opportunities: [],
    comments: [],
    status: 'new',
    generatedMessage: 'Текущее сообщение',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    activityLog: [],
    ...overrides,
  }
}

describe('pushMessageToHistory', () => {
  it('stores up to 10 variants', () => {
    let history = pushMessageToHistory(undefined, 'Вариант 1', '2026-01-01T00:00:00.000Z')

    for (let i = 2; i <= 12; i += 1) {
      history = pushMessageToHistory(history, `Вариант ${i}`, `2026-01-0${i}T00:00:00.000Z`)
    }

    expect(history).toHaveLength(MAX_LEAD_MESSAGE_HISTORY)
    expect(history[0]?.content).toBe('Вариант 12')
  })

  it('skips duplicate content', () => {
    const history = pushMessageToHistory(undefined, 'Одинаковый текст')
    const next = pushMessageToHistory(history, 'Одинаковый текст')

    expect(next).toHaveLength(1)
  })
})

describe('buildRegeneratedMessageUpdate', () => {
  it('archives current message when regenerating', () => {
    const lead = createLead()
    const update = buildRegeneratedMessageUpdate(lead, 'Новое сообщение', {
      archiveCurrent: true,
    })

    expect(update.generatedMessage).toBe('Новое сообщение')
    expect(update.messageHistory?.[0]?.content).toBe('Текущее сообщение')
  })

  it('does not archive on first generation', () => {
    const lead = createLead({ generatedMessage: undefined })
    const update = buildRegeneratedMessageUpdate(lead, 'Первое сообщение', {
      archiveCurrent: true,
    })

    expect(update.messageHistory).toEqual([])
  })

  it('archives explicit content when generatedMessage is missing', () => {
    const lead = createLead({ generatedMessage: undefined })
    const update = buildRegeneratedMessageUpdate(lead, 'Новое сообщение', {
      archiveCurrent: true,
      archiveContent: 'Шаблонное сообщение',
    })

    expect(update.messageHistory?.[0]?.content).toBe('Шаблонное сообщение')
  })
})

describe('buildRestoreMessageUpdate', () => {
  it('restores selected variant and archives current message', () => {
    const lead = createLead({
      generatedMessage: 'Текущее сообщение',
      messageHistory: [
        {
          id: 'variant-1',
          content: 'Старый вариант',
          createdAt: '2026-01-02T00:00:00.000Z',
        },
      ],
    })

    const update = buildRestoreMessageUpdate(lead, 'variant-1')
    expect(update?.generatedMessage).toBe('Старый вариант')
    expect(update?.messageHistory?.some((item) => item.content === 'Текущее сообщение')).toBe(true)
  })
})
