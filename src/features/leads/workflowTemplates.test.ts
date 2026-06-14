import { describe, expect, it } from 'vitest'
import type { Lead } from '@/domain/lead'
import {
  buildProposalTemplate,
  buildReviewRequestTemplate,
  getWorkflowCompanyName,
  PROPOSAL_FORBIDDEN_PHRASES,
} from './workflowTemplates'
import { buildOutreachMessage } from './outreachMessage'

function createLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'lead-1',
    name: 'Мебельщик из Яндекс Карт',
    niche: 'Мебельщик',
    city: 'Москва',
    source: 'yandex_maps',
    contacts: {},
    notes: '',
    tags: [],
    opportunities: [],
    comments: [],
    status: 'replied',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    activityLog: [],
    ...overrides,
  }
}

const profile = {
  name: 'Наталья',
  lastName: 'Лапкина',
  businessType: '',
  specialization: 'созданием сайтов',
  phone: '',
  whatsapp: '+79647819228',
  telegram: '@Nat1777',
  vk: '',
  email: 'lapkina.natalja @rambler.ru',
  website: '',
  portfolio: '',
}

describe('getWorkflowCompanyName', () => {
  it('uses lead.name, not outreach intro', () => {
    expect(getWorkflowCompanyName(createLead())).toBe('Мебельщик из Яндекс Карт')
  })
})

describe('buildProposalTemplate', () => {
  it('writes in first person feminine without CRM fields', () => {
    const text = buildProposalTemplate(createLead(), profile)

    expect(text).toContain('Я изучила компанию «Мебельщик из Яндекс Карт»')
    expect(text).toContain('подготовила')
    expect(text).toContain('Предлагаю:')
    expect(text).toContain('буду рада')
    expect(text).toContain('• разработать современный сайт;')
    expect(text).toContain('Наталья Лапкина')

    for (const phrase of PROPOSAL_FORBIDDEN_PHRASES) {
      expect(text.toLowerCase()).not.toContain(phrase.toLowerCase())
    }
    expect(text).not.toContain('Изучила вашу компанию')
  })

  it('normalizes email in signature and skips empty contacts', () => {
    const text = buildProposalTemplate(createLead(), profile)

    expect(text).toContain('WhatsApp: +79647819228')
    expect(text).toContain('Telegram: @Nat1777')
    expect(text).toContain('Email: lapkina.natalja@rambler.ru')
    expect(text).not.toContain('VK:')
  })
})

describe('buildReviewRequestTemplate', () => {
  it('uses fixed review text without company outreach intro', () => {
    const text = buildReviewRequestTemplate(createLead(), profile)

    expect(text.startsWith('Здравствуйте!')).toBe(true)
    expect(text).toContain('Спасибо за сотрудничество.')
    expect(text).toContain('• рекомендовали бы нас другим.')
    expect(text).not.toContain('Мебельщик из Яндекс Карт')
    expect(text).not.toContain('Изучила вашу компанию')
  })
})

describe('template separation', () => {
  it('outreach message differs from proposal and review', () => {
    const lead = createLead()
    const outreach = buildOutreachMessage(lead, profile)
    const proposal = buildProposalTemplate(lead, profile)
    const review = buildReviewRequestTemplate(lead, profile)

    expect(outreach).toContain('Изучила вашу компанию')
    expect(proposal).not.toContain('Изучила вашу компанию')
    expect(review).not.toContain('Изучила вашу компанию')
    expect(proposal).not.toEqual(review)
    expect(outreach).not.toEqual(proposal)
  })
})
