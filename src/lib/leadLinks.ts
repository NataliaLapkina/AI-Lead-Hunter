import type { Lead, LeadSource } from '@/domain/lead'
import { AUTO_SEARCH_SOURCES } from '@/lib/constants'
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

export function isFallbackLeadName(
  name: string,
  niche?: string,
  source?: LeadSource,
): boolean {
  const trimmed = name.trim()
  if (!trimmed) return false

  if (/^Компания из VK$/i.test(trimmed)) return true
  if (/ из Авито$/i.test(trimmed)) return true
  if (/ из Яндекс Карт$/i.test(trimmed)) return true
  if (/ из 2ГИС$/i.test(trimmed)) return true

  if (!niche) return false

  const sources = source ? [source] : AUTO_SEARCH_SOURCES
  return sources.some((src) => trimmed === buildFallbackLeadName(src, niche))
}

export function isLegacyAvitoLeadName(name: string): boolean {
  return /^Авито\s*[—\-–]/i.test(name.trim())
}

export function isLegacyGenericCompanyName(name: string): boolean {
  return /^Компания\b/i.test(name.trim())
}

export function isTechnicalLeadName(
  name: string | undefined | null,
  lead?: Pick<Lead, 'source' | 'niche'>,
): boolean {
  const trimmed = name?.trim() ?? ''
  if (!trimmed) return true
  if (/^(undefined|null)$/i.test(trimmed)) return true
  if (isLegacyItemLeadName(trimmed)) return true
  if (looksLikeUrl(trimmed)) return true
  if (isLegacyYandexMapsLeadName(trimmed)) return true
  if (isLegacyAvitoLeadName(trimmed)) return true
  if (isLegacyGenericCompanyName(trimmed)) return true
  if (isFallbackLeadName(trimmed, lead?.niche, lead?.source)) return true
  return false
}

export function sanitizeLeadName(
  name: string | undefined | null,
  lead?: Pick<Lead, 'source' | 'niche'>,
): string | null {
  const trimmed = name?.trim() ?? ''
  if (isTechnicalLeadName(trimmed, lead)) return null
  return trimmed || null
}

/** @deprecated Используйте sanitizeLeadName */
export function resolveLeadNameForOutreach(
  lead: Pick<Lead, 'name' | 'niche' | 'source' | 'sourceUrl' | 'website' | 'contacts'>,
): string | null {
  return sanitizeLeadName(lead.name, lead)
}

export function isPlaceholderLeadName(name: string | undefined | null): boolean {
  return isTechnicalLeadName(name)
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

  if (isLegacyYandexMapsLeadName(name)) {
    source = source === 'other' || source === 'company_site' ? 'yandex_maps' : source
    name = buildFallbackLeadName('yandex_maps', niche)
    return { name, sourceUrl, website, contacts, source }
  }

  if (isLegacyAvitoLeadName(name)) {
    source = 'avito'
    name = buildFallbackLeadName('avito', niche)
    return { name, sourceUrl, website, contacts, source }
  }

  const sourceLink = sourceUrl || website

  if (isLegacyItemLeadName(name)) {
    const detected = sourceLink
      ? detectSourceFromUrl(sourceLink, source)
      : source
    const resolvedSource =
      detected !== 'other' && detected !== 'company_site' && detected !== 'telegram'
        ? detected
        : sourceLink?.toLowerCase().includes('yandex')
          ? 'yandex_maps'
          : sourceLink?.toLowerCase().includes('avito')
            ? 'avito'
            : sourceLink?.toLowerCase().includes('2gis')
              ? '2gis'
              : sourceLink && isVkUrl(sourceLink)
                ? 'vk'
                : source

    if (
      resolvedSource === 'avito' ||
      resolvedSource === 'yandex_maps' ||
      resolvedSource === '2gis' ||
      resolvedSource === 'vk'
    ) {
      source = resolvedSource
      name = buildFallbackLeadName(resolvedSource, niche)
      return { name, sourceUrl, website, contacts, source }
    }
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
