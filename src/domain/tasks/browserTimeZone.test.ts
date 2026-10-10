import { describe, expect, it } from 'vitest'
import { readBrowserTimeZone } from './browserTimeZone'

describe('readBrowserTimeZone', () => {
  it('returns the browser IANA timezone', () => {
    const timeZone = readBrowserTimeZone()

    expect(timeZone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
    expect(timeZone && timeZone.length > 0).toBe(true)
  })

  it('rejects an empty or unusable timezone without substituting one', () => {
    expect(readBrowserTimeZone(() => '   ')).toBeNull()
    expect(readBrowserTimeZone(() => undefined)).toBeNull()
    expect(readBrowserTimeZone(() => 'Not/AZone')).toBeNull()
    expect(readBrowserTimeZone(() => {
      throw new Error('unavailable')
    })).toBeNull()
  })
})
