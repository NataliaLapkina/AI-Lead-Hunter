import { describe, expect, it } from 'vitest'
import type { AppProfile, Lead } from '@/domain/lead'
import { isFallbackLeadName, isPlaceholderLeadName, sanitizeLeadName } from '@/lib/leadLinks'
import {
  buildOutreachMessage,
  finalizeOutreachMessage,
  getSafeLeadIntro,
  safeLeadName,
} from './outreachMessage'

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

const nataliaProfile: Partial<AppProfile> = {
  name: 'Наталья',
  lastName: 'Лапкина',
  specialization: 'созданием сайтов',
  whatsapp: '+7 900 000-00-00',
  telegram: '@natalia',
  vk: 'vk.com/natalia',
  email: 'natalia@example.com',
  portfolio: 'https://portfolio.example.com',
}

describe('sanitizeLeadName', () => {
  it('detects Item placeholders', () => {
    expect(sanitizeLeadName('Item 100000')).toBeNull()
    expect(sanitizeLeadName('Item 100001')).toBeNull()
    expect(sanitizeLeadName('Item 100002')).toBeNull()
  })

  it('detects URLs, empty values and fallback names', () => {
    expect(sanitizeLeadName('https://vk.com/example')).toBeNull()
    expect(sanitizeLeadName('')).toBeNull()
    expect(sanitizeLeadName('Нутрициолог из Авито', { niche: 'Нутрициолог', source: 'avito' })).toBeNull()
  })

  it('allows real company names', () => {
    expect(sanitizeLeadName('Тест Клиника')).toBe('Тест Клиника')
  })
})

describe('getSafeLeadIntro', () => {
  it('uses normal company name', () => {
    expect(getSafeLeadIntro(createTestLead({ name: 'Тест Клиника' }))).toBe(
      'Изучила вашу компанию «Тест Клиника» и заметила несколько точек роста:',
    )
  })

  it('omits technical Item name', () => {
    expect(getSafeLeadIntro(createTestLead({ name: 'Item 100002' }))).toBe(
      'Изучила вашу компанию и заметила несколько точек роста:',
    )
  })

  it('omits name when empty', () => {
    expect(getSafeLeadIntro(createTestLead({ name: '' }))).toBe(
      'Изучила вашу компанию и заметила несколько точек роста:',
    )
  })
})

describe('buildOutreachMessage', () => {
  it('does not include Item placeholders in the final text', () => {
    for (const itemName of ['Item 100000', 'Item 100001', 'Item 100002']) {
      const message = buildOutreachMessage(
        createTestLead({
          name: itemName,
          source: 'avito',
          sourceUrl: 'https://www.avito.ru/moscow/nutritionist/item_100000',
        }),
        nataliaProfile,
      )

      expect(message).not.toContain('Item 100000')
      expect(message).not.toContain('Item 100001')
      expect(message).not.toContain('Item 100002')
      expect(message).not.toContain('undefined')
      expect(message).not.toContain('null')
      expect(message).toContain('Изучила вашу компанию и заметила несколько точек роста:')
    }
  })

  it('includes normal company name', () => {
    const message = buildOutreachMessage(createTestLead({ name: 'Тест Клиника' }), nataliaProfile)
    expect(message).toContain('«Тест Клиника»')
  })

  it('includes sender contacts from profile in signature', () => {
    const message = buildOutreachMessage(createTestLead({ name: 'Item 100002' }), nataliaProfile)

    expect(message).toContain('С уважением,')
    expect(message).toContain('Наталья Лапкина')
    expect(message).toContain('WhatsApp: +7 900 000-00-00')
    expect(message).toContain('Telegram: @natalia')
    expect(message).toContain('VK: vk.com/natalia')
    expect(message).toContain('Email: natalia@example.com')
    expect(message).toContain('Портфолио: https://portfolio.example.com')
  })

  it('shows only filled signature fields when contacts are empty', () => {
    const message = buildOutreachMessage(createTestLead({ name: 'Тест Клиника' }))

    expect(message).toContain('С уважением,')
    expect(message).toContain('Наталья Лапкина')
    expect(message).not.toMatch(/WhatsApp:\s*\n/)
    expect(message).not.toContain('WhatsApp: \n')
    expect(message).not.toContain('Telegram:')
    expect(message).not.toContain('Email:')
  })
})

describe('finalizeOutreachMessage', () => {
  it('scrubs Item names from stored AI text and refreshes signature', () => {
    const stored = `Здравствуйте!
Изучила вашу компанию «Item 100002» и заметила несколько точек роста:
• проблема
С уважением,
Старое Имя`

    const message = finalizeOutreachMessage(stored, createTestLead({ name: 'Item 100002' }), nataliaProfile)

    expect(message).not.toContain('Item 100002')
    expect(message).toContain('WhatsApp: +7 900 000-00-00')
    expect(message).toContain('Наталья Лапкина')
    expect(message).not.toContain('Старое Имя')
  })
})

describe('isPlaceholderLeadName', () => {
  it('flags Item names', () => {
    expect(isPlaceholderLeadName('Item 100000')).toBe(true)
  })
})

describe('isFallbackLeadName', () => {
  it('flags auto-generated fallback names', () => {
    expect(isFallbackLeadName('Нутрициолог из Авито', 'Нутрициолог', 'avito')).toBe(true)
    expect(isFallbackLeadName('Тест Клиника', 'Нутрициолог', 'avito')).toBe(false)
  })
})

describe('safeLeadName', () => {
  it('returns null for Item lead', () => {
    expect(safeLeadName(createTestLead({ name: 'Item 100002' }))).toBeNull()
  })
})
