import { describe, expect, it } from 'vitest'
import { hasOpenAIKey, normalizeOpenAIApiKey } from './openaiClient'

describe('normalizeOpenAIApiKey', () => {
  it('trims whitespace and quotes', () => {
    expect(normalizeOpenAIApiKey('  "sk-test-key-1234567890"  ')).toBe(
      'sk-test-key-1234567890',
    )
  })
})

describe('hasOpenAIKey', () => {
  it('accepts standard sk- keys', () => {
    expect(hasOpenAIKey('sk-proj-abcdefghijklmnopqrstuvwxyz')).toBe(true)
  })

  it('accepts saved long secrets without sk- prefix', () => {
    expect(hasOpenAIKey('local-dev-secret-key-1234567890')).toBe(true)
  })

  it('rejects empty values', () => {
    expect(hasOpenAIKey('')).toBe(false)
    expect(hasOpenAIKey(undefined)).toBe(false)
  })
})
