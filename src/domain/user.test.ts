import { describe, expect, it } from 'vitest'
import { parseUserId } from './user'

describe('parseUserId', () => {
  it('returns a user id', () => {
    expect(parseUserId('user-123')).toBe('user-123')
  })

  it('returns a trimmed user id', () => {
    expect(parseUserId('  user-123  ')).toBe('user-123')
  })

  it('returns null for empty or whitespace values', () => {
    expect(parseUserId('')).toBeNull()
    expect(parseUserId('   ')).toBeNull()
  })

  it('returns null for non-string values', () => {
    expect(parseUserId(undefined)).toBeNull()
    expect(parseUserId(null)).toBeNull()
  })
})
