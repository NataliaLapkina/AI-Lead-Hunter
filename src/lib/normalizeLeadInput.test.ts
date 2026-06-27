import { describe, expect, it } from 'vitest'
import {
  classifyLink,
  cleanLeadName,
  extractDomain,
  extractEmailFromText,
  extractPhoneFromText,
  extractUrlsFromText,
  normalizePhoneForComparison,
  parseLeadFragmentsFromText,
} from './normalizeLeadInput'

describe('normalizeLeadInput', () => {
  it('classifies links by type', () => {
    expect(classifyLink('https://vk.com/demo_shop')).toBe('vk')
    expect(classifyLink('https://t.me/demo_shop')).toBe('telegram')
    expect(classifyLink('https://www.avito.ru/moscow/item_1')).toBe('source_platform')
    expect(classifyLink('https://example.com')).toBe('website')
    expect(classifyLink('not-a-url')).toBe('invalid')
  })

  it('extracts contacts and routes urls to correct fields', () => {
    const parsed = parseLeadFragmentsFromText(
      [
        'Студия «Говорун»',
        'https://vk.com/demo_govorun',
        'hello@demo-govorun.example',
        '+7 (900) 111-22-33',
      ].join('\n'),
      'other',
    )

    expect(parsed.name).toBe('Студия «Говорун»')
    expect(parsed.contacts.vk).toBe('https://vk.com/demo_govorun')
    expect(parsed.contacts.email).toBe('hello@demo-govorun.example')
    expect(parsed.contacts.phone).toBe('+7 (900) 111-22-33')
    expect(parsed.sourceUrl).toBe('https://vk.com/demo_govorun')
    expect(parsed.website).toBeUndefined()
    expect(parsed.detectedSource).toBe('vk')
  })

  it('does not use url as lead name', () => {
    expect(cleanLeadName('https://example.com')).toBeNull()
    expect(parseLeadFragmentsFromText('https://example.com', 'other').name).toBeUndefined()
  })

  it('puts regular website into website field', () => {
    const parsed = parseLeadFragmentsFromText('https://demo-studio.example.ru', 'other')
    expect(parsed.website).toBe('https://demo-studio.example.ru')
    expect(parsed.sourceUrl).toBeUndefined()
  })

  it('extracts telegram handle', () => {
    const parsed = parseLeadFragmentsFromText('@demo_studio', 'other')
    expect(parsed.contacts.telegram).toBe('@demo_studio')
  })

  it('normalizes phone comparison', () => {
    expect(normalizePhoneForComparison('+7 (900) 111-22-33')).toBe('9001112233')
    expect(normalizePhoneForComparison('8 900 111 22 33')).toBe('9001112233')
  })

  it('extracts domain from url', () => {
    expect(extractDomain('https://www.example.com/page')).toBe('example.com')
  })

  it('extracts email and phone from free text', () => {
    expect(extractEmailFromText('Пишите на info@demo.example')).toBe('info@demo.example')
    expect(extractPhoneFromText('Звоните +7 900 000 00 01')).toBe('+7 900 000 00 01')
  })

  it('deduplicates urls in text', () => {
    expect(
      extractUrlsFromText('https://example.com https://example.com/ https://www.example.com'),
    ).toHaveLength(1)
  })
})
