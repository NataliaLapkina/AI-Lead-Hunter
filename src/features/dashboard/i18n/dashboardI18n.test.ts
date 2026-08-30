import { describe, expect, it } from 'vitest'
import { createDashboardTranslate, t } from './dashboardI18n'

describe('dashboardI18n', () => {
  it('returns Russian strings by default keys', () => {
    expect(t('ru', 'findLeads')).toBe('Найти лидов')
    expect(t('ru', 'leadAdded')).toBe('Лиды найдены')
    expect(t('ru', 'emailRecipient')).toBe('Кому')
    expect(t('ru', 'emailDraftBanner')).toContain('AI подготовил первый вариант письма')
  })

  it('returns English strings', () => {
    expect(t('en', 'findLeads')).toBe('Find leads')
    expect(t('en', 'leadAdded')).toBe('Leads added')
    expect(t('en', 'emailRecipient')).toBe('To')
    expect(t('en', 'emailDraftBanner')).toContain('AI has prepared the first draft')
  })

  it('creates bound translate helper', () => {
    const translate = createDashboardTranslate('en')
    expect(translate('savedSuccessfully')).toBe('Saved successfully')
  })
})
