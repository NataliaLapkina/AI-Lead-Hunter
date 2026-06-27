import type { LeadContacts, LeadSource } from '@/domain/lead'
import {
  detectSourceFromUrl,
  isSourcePlatformUrl,
  isTelegramUrl,
  isVkUrl,
  looksLikeUrl,
  normalizeExternalUrl,
  sanitizeLeadName,
} from '@/lib/leadLinks'

export type LinkType = 'vk' | 'telegram' | 'source_platform' | 'website' | 'invalid'

const URL_SPLIT = /[\n,;\s]+/
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i
const PHONE_RE =
  /(?:\+7|8)[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}|\+\d{10,15}/
const TELEGRAM_HANDLE_RE = /^@?[a-zA-Z][\w\d_]{4,31}$/

export function normalizeUrlForComparison(url: string): string {
  try {
    const parsed = new URL(normalizeExternalUrl(url.trim()))
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase()
    const path = parsed.pathname.replace(/\/$/, '').toLowerCase()
    return `${host}${path}${parsed.search}`.toLowerCase()
  } catch {
    return url.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
  }
}

export function normalizePhoneForComparison(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length >= 10) return digits.slice(-10)
  return digits
}

export function extractDomain(url: string): string | undefined {
  try {
    return new URL(normalizeExternalUrl(url)).hostname.replace(/^www\./, '')
  } catch {
    return undefined
  }
}

export function classifyLink(url: string): LinkType {
  const trimmed = url.trim()
  if (!trimmed || !looksLikeUrl(trimmed)) return 'invalid'
  const normalized = normalizeExternalUrl(trimmed)
  if (isVkUrl(normalized)) return 'vk'
  if (isTelegramUrl(normalized)) return 'telegram'
  if (isSourcePlatformUrl(normalized)) return 'source_platform'
  return 'website'
}

export function extractUrlsFromText(text: string): string[] {
  const seen = new Set<string>()
  const urls: string[] = []

  for (const part of text.split(URL_SPLIT)) {
    const trimmed = part.trim()
    if (!trimmed) continue

    let candidate = trimmed
    if (!/^https?:\/\//i.test(candidate) && looksLikeUrl(candidate)) {
      candidate = normalizeExternalUrl(candidate)
    }
    if (!looksLikeUrl(candidate)) continue

    const normalized = normalizeExternalUrl(candidate)
    const key = normalizeUrlForComparison(normalized)
    if (seen.has(key)) continue
    seen.add(key)
    urls.push(normalized)
  }

  return urls
}

export function extractEmailFromText(text: string): string | undefined {
  const match = text.match(EMAIL_RE)
  return match ? match[0].trim().toLowerCase() : undefined
}

export function extractPhoneFromText(text: string): string | undefined {
  const match = text.match(PHONE_RE)
  return match ? match[0].trim() : undefined
}

export function cleanLeadName(
  value: string,
  lead?: Pick<import('@/domain/lead').Lead, 'niche' | 'source'>,
): string | null {
  const trimmed = value.trim().replace(/\s+/g, ' ')
  return sanitizeLeadName(trimmed, lead)
}

export interface ParsedLeadFragments {
  name?: string
  website?: string
  sourceUrl?: string
  contacts: LeadContacts
  detectedSource?: LeadSource
}

export function parseLeadFragmentsFromText(
  text: string,
  fallbackSource: LeadSource,
): ParsedLeadFragments {
  const contacts: LeadContacts = {}
  let website: string | undefined
  let sourceUrl: string | undefined
  let detectedSource: LeadSource | undefined
  let name: string | undefined

  const email = extractEmailFromText(text)
  if (email) contacts.email = email

  const phone = extractPhoneFromText(text)
  if (phone) contacts.phone = phone

  for (const url of extractUrlsFromText(text)) {
    const linkType = classifyLink(url)

    switch (linkType) {
      case 'vk':
        contacts.vk = contacts.vk ?? url
        sourceUrl = sourceUrl ?? url
        detectedSource = detectSourceFromUrl(url, fallbackSource)
        break
      case 'telegram':
        contacts.telegram = contacts.telegram ?? url
        detectedSource = 'telegram'
        break
      case 'source_platform':
        sourceUrl = sourceUrl ?? url
        detectedSource = detectSourceFromUrl(url, fallbackSource)
        break
      case 'website':
        website = website ?? url
        break
      default:
        break
    }
  }

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (looksLikeUrl(trimmed)) continue
    if (EMAIL_RE.test(trimmed)) continue
    if (PHONE_RE.test(trimmed)) continue

    const handle = trimmed.replace(/^https?:\/\/(t\.me|telegram\.me)\//i, '').trim()
    if (TELEGRAM_HANDLE_RE.test(handle)) {
      contacts.telegram = contacts.telegram ?? (handle.startsWith('@') ? handle : `@${handle}`)
      continue
    }

    const candidateName = cleanLeadName(trimmed, {
      source: detectedSource ?? fallbackSource,
      niche: '',
    })
    if (candidateName) {
      name = candidateName
      break
    }
  }

  return {
    name,
    website,
    sourceUrl,
    contacts,
    detectedSource,
  }
}
