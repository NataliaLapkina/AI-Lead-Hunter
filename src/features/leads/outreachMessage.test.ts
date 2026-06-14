import { describe, expect, it } from 'vitest'
import type { AppProfile, Lead } from '@/domain/lead'
import {
  fixLegacyLeadName,
  isFallbackLeadName,
  isTechnicalLeadName,
  sanitizeLeadName,
} from '@/lib/leadLinks'
import {
  buildOutreachMessage,
  finalizeOutreachMessage,
  getSafeLeadIntro,
  safeLeadName,
  scrubLegacyNamesFromText,
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
  website: 'https://natalia.dev',
  portfolio: 'https://portfolio.example.com',
}

describe('sanitizeLeadName', () => {
  it('detects Item placeholders', () => {
    expect(sanitizeLeadName('Item 100000')).toBeNull()
    expect(sanitizeLeadName('Item 100001')).toBeNull()
    expect(sanitizeLeadName('Item 100002')).toBeNull()
  })

  it('detects legacy source prefixes and fallback names', () => {
    expect(sanitizeLeadName('Яндекс Карты — Мебельщик 5')).toBeNull()
    expect(sanitizeLeadName('Авито — Нутрициолог 3')).toBeNull()
    expect(sanitizeLeadName('Нутрициолог из Авито', { niche: 'Нутрициолог', source: 'avito' })).toBeNull()
    expect(sanitizeLeadName('Компания из VK')).toBeNull()
  })

  it('allows real company names', () => {
    expect(sanitizeLeadName('Тест Клиника')).toBe('Тест Клиника')
  })
})

describe('fixLegacyLeadName', () => {
  it('migrates Item to fallback by source url', () => {
    const fixed = fixLegacyLeadName({
      name: 'Item 100000',
      niche: 'Мебельщик',
      source: 'yandex_maps',
      sourceUrl: 'https://yandex.ru/maps/org/mebel/1',
      contacts: {},
    })
    expect(fixed.name).toBe('Мебельщик из Яндекс Карт')
  })

  it('migrates Yandex legacy prefix', () => {
    const fixed = fixLegacyLeadName({
      name: 'Яндекс Карты — Мебельщик 5',
      niche: 'Мебельщик',
      source: 'yandex_maps',
      contacts: {},
    })
    expect(fixed.name).toBe('Мебельщик из Яндекс Карт')
  })

  it('migrates Avito legacy prefix', () => {
    const fixed = fixLegacyLeadName({
      name: 'Авито — Нутрициолог 3',
      niche: 'Нутрициолог',
      source: 'avito',
      contacts: {},
    })
    expect(fixed.name).toBe('Нутрициолог из Авито')
  })
})

describe('getSafeLeadIntro', () => {
  it('uses normal company name', () => {
    expect(getSafeLeadIntro(createTestLead({ name: 'Тест Клиника' }))).toBe(
      'Изучила вашу компанию «Тест Клиника» и заметила несколько точек роста:',
    )
  })

  it('omits technical legacy names', () => {
    expect(getSafeLeadIntro(createTestLead({ name: 'Item 100002' }))).toBe(
      'Изучила вашу компанию и заметила несколько точек роста:',
    )
    expect(getSafeLeadIntro(createTestLead({ name: 'Яндекс Карты — Мебельщик 5', niche: 'Мебельщик', source: 'yandex_maps' }))).toBe(
      'Изучила вашу компанию и заметила несколько точек роста:',
    )
  })
})

describe('buildOutreachMessage', () => {
  it('does not include legacy placeholders in the final text', () => {
    const cases = [
      createTestLead({ name: 'Item 100002', source: 'avito' }),
      createTestLead({ name: 'Яндекс Карты — Мебельщик 5', niche: 'Мебельщик', source: 'yandex_maps' }),
      createTestLead({ name: 'Мебельщик из Яндекс Карт', niche: 'Мебельщик', source: 'yandex_maps' }),
    ]

    for (const lead of cases) {
      const message = buildOutreachMessage(lead, nataliaProfile)
      expect(message).not.toContain('Item 100002')
      expect(message).not.toContain('Яндекс Карты —')
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
    expect(message).toContain('Сайт: https://natalia.dev')
    expect(message).toContain('Портфолио: https://portfolio.example.com')
  })

  it('shows only filled signature fields when contacts are empty', () => {
    const message = buildOutreachMessage(createTestLead({ name: 'Тест Клиника' }))

    expect(message).toContain('С уважением,')
    expect(message).toContain('Наталья Лапкина')
    expect(message).not.toContain('WhatsApp:')
    expect(message).not.toContain('Telegram:')
    expect(message).not.toContain('Email:')
    expect(message).not.toContain('Сайт:')
  })
})

describe('scrubLegacyNamesFromText', () => {
  it('removes Item and Yandex legacy fragments', () => {
    const cleaned = scrubLegacyNamesFromText(
      'Изучила вашу компанию «Item 100002» и «Яндекс Карты — Мебельщик 5»',
    )
    expect(cleaned).not.toContain('Item 100002')
    expect(cleaned).not.toContain('Яндекс Карты —')
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

describe('isTechnicalLeadName', () => {
  it('flags Item and legacy names', () => {
    expect(isTechnicalLeadName('Item 100000')).toBe(true)
    expect(isTechnicalLeadName('Авито — Нутрициолог 3')).toBe(true)
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
