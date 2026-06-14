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
