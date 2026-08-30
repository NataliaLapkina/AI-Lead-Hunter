import { describe, expect, it } from 'vitest'
import { resolveActivationPhase } from './activationStorage'
import { buildMockLeads } from './dashboardMvpMock'

describe('dashboard leads flow after search', () => {
  it('creates three mock leads and enters active phase', () => {
    const firstVisit = false
    const leads = buildMockLeads('design agency')

    expect(leads).toHaveLength(3)
    expect(leads.every((lead) => lead.status === 'new')).toBe(true)
    expect(resolveActivationPhase(firstVisit, leads.length)).toBe('active')
  })

  it('enters active phase after search even when firstVisit flag is still true', () => {
    const leads = buildMockLeads('marketing')

    expect(resolveActivationPhase(true, leads.length)).toBe('active')
  })
})
