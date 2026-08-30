import { describe, expect, it } from 'vitest'
import { resolveActivationPhase } from './activationStorage'

describe('resolveActivationPhase', () => {
  it('shows onboarding on first visit without leads', () => {
    expect(resolveActivationPhase(true, 0)).toBe('onboarding')
  })

  it('shows active state when leads exist even on first visit', () => {
    expect(resolveActivationPhase(true, 3)).toBe('active')
  })

  it('shows empty hero after onboarding without leads', () => {
    expect(resolveActivationPhase(false, 0)).toBe('empty')
  })

  it('shows active state when leads exist', () => {
    expect(resolveActivationPhase(false, 3)).toBe('active')
  })
})
