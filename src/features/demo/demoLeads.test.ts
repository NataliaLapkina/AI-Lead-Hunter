import { describe, expect, it } from 'vitest'
import { createDemoLeads, DEMO_LEADS_COUNT, isDemoLead } from './demoLeads'

describe('createDemoLeads', () => {
  it('creates 7 demo leads', () => {
    expect(DEMO_LEADS_COUNT).toBe(7)
    expect(createDemoLeads()).toHaveLength(7)
  })

  it('uses fictional contacts and demo tag', () => {
    const leads = createDemoLeads()

    for (const lead of leads) {
      expect(isDemoLead(lead)).toBe(true)
      expect(lead.contacts.email).toMatch(/@demo-.*\.example$/)
      expect(lead.contacts.phone).toMatch(/^\+7 \(900\) 000-00-/)
      expect(lead.siteAudit).toBeDefined()
      expect(lead.notes).toContain('Демо-лид')
    }
  })

  it('covers requested niches', () => {
    const niches = createDemoLeads().map((lead) => lead.niche)
    expect(niches).toEqual(
      expect.arrayContaining([
        'Логопед',
        'Нутрициолог',
        'Юрист',
        'Бухгалтер',
        'Мебельщик',
        'Фотограф',
      ]),
    )
  })
})
