import { describe, expect, it } from 'vitest'
import {
  containsForbiddenPersonalVoice,
  normalizePersonalVoice,
  usesPersonalFirstPersonVoice,
} from './personalMessageVoice'
import { finalizeOutreachMessage } from '@/features/leads/outreachMessage'
import type { Lead } from '@/domain/lead'

const nataliaProfile = {
  name: 'Наталья',
  lastName: 'Лапкина',
  businessType: '',
  specialization: 'созданием сайтов',
  phone: '',
  whatsapp: '',
  telegram: '',
  vk: '',
  email: '',
  website: '',
  portfolio: '',
}

describe('usesPersonalFirstPersonVoice', () => {
  it('returns true for Natalia Lapkina', () => {
    expect(usesPersonalFirstPersonVoice(nataliaProfile)).toBe(true)
  })
})

describe('normalizePersonalVoice', () => {
  it('replaces corporate plural with first person feminine', () => {
    const input =
      'Спасибо за сотрудничество. Буду благодарна за отзыв о нашей работе. Рекомендовали бы нас другим.'
    const result = normalizePersonalVoice(input, nataliaProfile)

    expect(result).toContain('моей работе')
    expect(result).toContain('порекомендовали бы меня')
    expect(containsForbiddenPersonalVoice(result)).toBeNull()
  })
})

describe('finalizeOutreachMessage', () => {
  it('scrubs corporate voice from AI drafts', () => {
    const lead: Lead = {
      id: '1',
      name: 'Клиника',
      niche: 'Логопед',
      city: 'Москва',
      source: 'avito',
      contacts: {},
      notes: '',
      tags: [],
      opportunities: [],
      comments: [],
      status: 'new',
      createdAt: '',
      updatedAt: '',
      activityLog: [],
    }

    const message = finalizeOutreachMessage(
      'Здравствуйте!\nМы предлагаем улучшить сайт. Наша компания поможет.\nС уважением,\nНаталья Лапкина',
      lead,
      nataliaProfile,
    )

    expect(message).toContain('предлагаю')
    expect(message.toLowerCase()).not.toContain('наша компания')
    expect(message.toLowerCase()).not.toContain('мы предлагаем')
  })
})
