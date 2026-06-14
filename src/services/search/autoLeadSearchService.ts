import type {
  AutoSearchDraftLead,
  AutoSearchParams,
  AutoSearchSource,
  Lead,
  LeadContacts,
  LeadSource,
} from '@/domain/lead'
import { buildOutreachMessage } from '@/features/leads/outreachMessage'
import { suggestOpportunitiesFromLead } from '@/features/leads/improvements'
import { normalizeNicheName } from '@/lib/nicheDisplay'
import { generateId } from '@/lib/utils'

const URL_SPLIT = /[\n,;\s]+/

export function parseLinksFromText(text: string): string[] {
  if (!text.trim()) return []
  const seen = new Set<string>()
  const urls: string[] = []

  for (const part of text.split(URL_SPLIT)) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const normalized = normalizeUrl(trimmed)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    urls.push(normalized)
  }

  return urls
}

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.includes('.') && !trimmed.includes(' ')) {
    return `https://${trimmed}`
  }
  return null
}

export function detectSourceFromUrl(url: string, fallback: LeadSource): LeadSource {
  const lower = url.toLowerCase()
  if (lower.includes('avito.ru') || lower.includes('avito.com')) return 'avito'
  if (lower.includes('yandex.') && lower.includes('/maps')) return 'yandex_maps'
  if (lower.includes('2gis.ru') || lower.includes('2gis.com')) return '2gis'
  if (lower.includes('vk.com') || lower.includes('vk.ru') || lower.includes('vk.me')) return 'vk'
  return fallback
}

function slugToTitle(slug: string): string {
  const decoded = decodeURIComponent(slug)
    .replace(/[_+]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\?.*$/, '')
    .trim()
  if (!decoded) return ''
  return decoded.charAt(0).toLocaleUpperCase('ru-RU') + decoded.slice(1)
}

export function extractCompanyNameFromUrl(url: string, index: number, niche: string): string {
  try {
    const parsed = new URL(url)
    const segments = parsed.pathname.split('/').filter(Boolean)
    const host = parsed.hostname.replace(/^www\./, '')

    if (host.includes('avito.ru') && segments.length >= 2) {
      const name = slugToTitle(segments[segments.length - 1])
      if (name.length > 2) return name
    }

    if (host.includes('vk.com') || host.includes('vk.ru')) {
      const id = segments[0] ?? ''
      if (id.startsWith('club') || id.startsWith('public')) {
        return slugToTitle(id.replace(/^(club|public)/, '')) || `VK — ${niche} ${index + 1}`
      }
      return slugToTitle(id) || `VK — ${niche} ${index + 1}`
    }

    if (host.includes('2gis')) {
      const name = slugToTitle(segments[segments.length - 1] ?? '')
      if (name.length > 2) return name
      return `2ГИС — ${niche} ${index + 1}`
    }

    if (host.includes('yandex')) {
      const name = slugToTitle(segments[segments.length - 1] ?? '')
      if (name.length > 2) return name
      return `Яндекс Карты — ${niche} ${index + 1}`
    }

    const last = slugToTitle(segments[segments.length - 1] ?? '')
    if (last.length > 2) return last
  } catch {
    /* ignore invalid URL */
  }

  return `${normalizeNicheName(niche)} — профиль ${index + 1}`
}

function mockContactsForIndex(index: number, source: LeadSource): LeadContacts {
  const contacts: LeadContacts = { emails: [], phones: [] }

  if (index % 2 === 0) {
    contacts.phones = [`+7 (9${String(10 + (index % 8)).padStart(2, '0')}) ${100 + index}-${20 + index}-${30 + index}`]
  }
  if (index % 3 === 0) {
    contacts.emails = [`info${index + 1}@example.com`]
  }
  if (source === 'vk' && index % 4 !== 1) {
    contacts.telegram = `@${source}_lead_${index + 1}`
  }

  return contacts
}

function buildMockUrl(source: AutoSearchSource, niche: string, city: string, index: number): string {
  const nicheSlug = niche.trim().toLowerCase().replace(/\s+/g, '_')
  const citySlug = city.trim().toLowerCase().replace(/\s+/g, '_') || 'rossiya'

  switch (source) {
    case 'avito':
      return `https://www.avito.ru/${citySlug}/${nicheSlug}/item_${100000 + index}`
    case 'yandex_maps':
      return `https://yandex.ru/maps/org/${nicheSlug}_${citySlug}/${index + 1}`
    case '2gis':
      return `https://2gis.ru/${citySlug}/firm/${nicheSlug}-${index + 1}`
    case 'vk':
      return `https://vk.com/${nicheSlug}_${citySlug}_${index + 1}`
    default:
      return `https://example.com/${nicheSlug}/${index + 1}`
  }
}

function buildDraftLead(
  params: Pick<AutoSearchParams, 'niche' | 'city'>,
  url: string,
  source: LeadSource,
  index: number,
): AutoSearchDraftLead {
  const niche = normalizeNicheName(params.niche)
  const name = extractCompanyNameFromUrl(url, index, niche)
  const contacts = mockContactsForIndex(index, source)
  const partialLead: Partial<Lead> = {
    name,
    niche,
    city: params.city,
    source,
    website: url,
    contacts,
  }
  const opportunities = suggestOpportunitiesFromLead(partialLead)
  const leadForMessage: Lead = {
    id: 'temp',
    name,
    niche,
    city: params.city,
    source,
    website: url,
    contacts,
    notes: '',
    status: 'draft',
    tags: [],
    opportunities,
    comments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    activityLog: [],
  }

  return {
    id: generateId(),
    selected: true,
    name,
    niche,
    city: params.city,
    source,
    website: url,
    contacts,
    opportunities,
    generatedMessage: buildOutreachMessage(leadForMessage),
    notes: '',
  }
}

export function runAutoLeadSearch(params: AutoSearchParams): AutoSearchDraftLead[] {
  const count = Math.min(Math.max(params.count, 1), 50)
  const links = parseLinksFromText(params.linksText ?? '')

  if (links.length > 0) {
    const limited = links.slice(0, count)
    return limited.map((url, index) =>
      buildDraftLead(
        params,
        url,
        detectSourceFromUrl(url, params.source),
        index,
      ),
    )
  }

  return Array.from({ length: count }, (_, index) => {
    const url = buildMockUrl(params.source, params.niche, params.city, index)
    return buildDraftLead(params, url, params.source, index)
  })
}

export function draftToCreateLeadInput(draft: AutoSearchDraftLead) {
  return {
    name: draft.name,
    niche: draft.niche,
    city: draft.city,
    source: draft.source,
    website: draft.website,
    contacts: draft.contacts,
    notes: draft.notes,
    tags: ['autosearch'],
    opportunities: draft.opportunities,
    status: 'draft' as const,
    generatedMessage: draft.generatedMessage,
  }
}

export function regenerateDraftMessage(draft: AutoSearchDraftLead): string {
  const lead: Lead = {
    id: draft.id,
    name: draft.name,
    niche: draft.niche,
    city: draft.city,
    source: draft.source,
    website: draft.website,
    contacts: draft.contacts,
    notes: draft.notes,
    status: 'draft',
    tags: [],
    opportunities: draft.opportunities,
    comments: [],
    generatedMessage: draft.generatedMessage,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    activityLog: [],
  }
  return buildOutreachMessage(lead)
}
