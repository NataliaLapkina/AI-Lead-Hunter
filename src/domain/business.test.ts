import { describe, expect, it } from 'vitest'
import { parseBusinessId } from './business'

describe('parseBusinessId', () => {
  it('returns a trimmed business id', () => {
    expect(parseBusinessId('  biz_123  ')).toBe('biz_123')
  })

  it('returns null for empty or whitespace values', () => {
    expect(parseBusinessId('')).toBeNull()
    expect(parseBusinessId('   ')).toBeNull()
  })

  it('returns null for non-string values', () => {
    expect(parseBusinessId(undefined)).toBeNull()
    expect(parseBusinessId(null)).toBeNull()
    expect(parseBusinessId(42)).toBeNull()
  })
})
