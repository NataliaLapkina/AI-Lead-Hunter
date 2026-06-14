import type { Lead, LeadSource } from '@/domain/lead'
import { getSourceLabel } from '@/i18n/ru'
import { normalizeNicheName } from '@/lib/nicheDisplay'

export function normalizeExternalUrl(url: string): string {
  const trimmed = url.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed.replace(/^\/+/, '')}`
}

export function isSourcePlatformUrl(url: string): boolean {
  const lower = url.toLowerCase()
  return (
    lower.includes('avito.ru') ||
    lower.includes('avito.com') ||
    (lower.includes('yandex.') && lower.includes('/maps')) ||
    lower.includes('2gis.ru') ||
    lower.includes('2gis.com') ||
    lower.includes('vk.com/') ||
    lower.includes('vk.ru/')
  )
}

export function isVkUrl(url: string): boolean {
  const lower = url.toLowerCase()
  return lower.includes('vk.com') || lower.includes('vk.ru') || lower.includes('vk.me')
}

export function looksLikeUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (/^https?:\/\//i.test(trimmed)) return true
  if (trimmed.includes(' ')) return false
  return /^[\w.-]+\.(ru|com|org|net|io|me)(\/|$)/i.test(trimmed)
}

export function detectSourceFromUrl(url: string, fallback: LeadSource): LeadSource {
  const lower = url.toLowerCase()
  if (lower.includes('avito.ru') || lower.includes('avito.com')) return 'avito'
  if (lower.includes('yandex.') && lower.includes('/maps')) return 'yandex_maps'
  if (lower.includes('2gis.ru') || lower.includes('2gis.com')) return '2gis'
  if (isVkUrl(url)) return 'vk'
  return fallback
}

export function isPlaceholderLeadName(name: string | undefined | null): boolean {
  const trimmed = name?.trim() ?? ''
  if (!trimmed) return true
  if (isLegacyItemLeadName(trimmed)) return true
  if (looksLikeUrl(trimmed)) return true
  if (isLegacyYandexMapsLeadName(trimmed)) return true
  return false
}

export function resolveLeadNameForOutreach(
  lead: Pick<Lead, 'name' | 'niche' | 'source' | 'sourceUrl' | 'website' | 'contacts'>,
): string | null {
  const raw = lead.name?.trim() ?? ''
  if (!isPlaceholderLeadName(raw)) {
    return raw
  }

  const fixed = fixLegacyLeadName(lead)
  const normalized = fixed.name.trim()
  if (normalized && !isPlaceholderLeadName(normalized)) {
    return normalized
  }

  return null
}

export function isLegacyItemLeadName(name: string): boolean {
  return /^Item\s+\d+/i.test(name.trim())
}

export function isLegacyYandexMapsLeadName(name: string): boolean {
  const trimmed = name.trim()
  return trimmed.includes('Яндекс Карты —') || trimmed.includes('Яндекс Карты -')
}

export function fixLegacyLeadName(
  lead: Pick<Lead, 'name' | 'niche' | 'source' | 'sourceUrl' | 'website' | 'contacts'>,
): Pick<Lead, 'name' | 'sourceUrl' | 'website' | 'contacts' | 'source'> {
  let name = lead.name.trim()
  let sourceUrl = lead.sourceUrl?.trim()
  let website = lead.website?.trim()
  const contacts = { ...lead.contacts }
  let source = lead.source
  const niche = lead.niche || 'Компания'

  if (looksLikeUrl(name)) {
    const url = normalizeExternalUrl(name)

    if (isVkUrl(url)) {
      sourceUrl = sourceUrl || url
      contacts.vk = contacts.vk?.trim() || url
      source = source === 'other' || source === 'company_site' ? 'vk' : source
      name = buildFallbackLeadName('vk', niche)
      return { name, sourceUrl, website, contacts, source }
    }

    if (isSourcePlatformUrl(url)) {
      const detected = detectSourceFromUrl(url, source)
      sourceUrl = sourceUrl || url
      source = detected
      name = buildFallbackLeadName(detected, niche)
      return { name, sourceUrl, website, contacts, source }
    }
  }

  const sourceLink = sourceUrl || website
  const isAvitoLead =
    source === 'avito' || Boolean(sourceLink && sourceLink.toLowerCase().includes('avito'))

  if (isLegacyItemLeadName(name) && isAvitoLead) {
    source = 'avito'
    name = buildFallbackLeadName('avito', niche)
    return { name, sourceUrl, website, contacts, source }
  }

  if (isLegacyYandexMapsLeadName(name)) {
    source = source === 'other' || source === 'company_site' ? 'yandex_maps' : source
    name = buildFallbackLeadName('yandex_maps', niche)
    return { name, sourceUrl, website, contacts, source }
  }

  return { name, sourceUrl, website, contacts, source }
}

export function buildFallbackLeadName(source: LeadSource, niche: string): string {
  const label = normalizeNicheName(niche)

  switch (source) {
    case 'avito':
      return `${label} из Авито`
    case 'yandex_maps':
      return `${label} из Яндекс Карт`
    case '2gis':
      return `${label} из 2ГИС`
    case 'vk':
      return 'Компания из VK'
    default:
      return `${label} — ${getSourceLabel(source)}`
  }
}

export function getLeadLinkUrl(lead: Pick<Lead, 'sourceUrl' | 'website'>): string | null {
  const raw = lead.sourceUrl?.trim() || lead.website?.trim()
  if (!raw) return null
  return normalizeExternalUrl(raw)
}

export function getLeadLinkDisplay(lead: Pick<Lead, 'sourceUrl' | 'website'>): string {
  const url = lead.sourceUrl || lead.website
  if (!url) return ''
  try {
    return new URL(normalizeExternalUrl(url)).hostname.replace(/^www\./, '')
  } catch {
    return url.replace(/^https?:\/\//, '').slice(0, 48)
  }
}

export function splitWebsiteAndSourceUrl(
  website?: string,
  sourceUrl?: string,
): { website?: string; sourceUrl?: string } {
  const explicitSource = sourceUrl?.trim()
  const site = website?.trim()

  if (explicitSource) {
    return {
      sourceUrl: explicitSource,
      website: site && !isSourcePlatformUrl(site) ? site : undefined,
    }
  }

  if (site && isSourcePlatformUrl(site)) {
    return { sourceUrl: site, website: undefined }
  }

  return {
    website: site || undefined,
    sourceUrl: undefined,
  }
}
