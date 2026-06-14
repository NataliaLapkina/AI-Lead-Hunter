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
import { buildFallbackLeadName, detectSourceFromUrl, normalizeExternalUrl } from '@/lib/leadLinks'
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

function mockContactsForIndex(index: number): LeadContacts {
  const contacts: LeadContacts = {}

  if (index % 2 === 0) {
    contacts.phone = `+7 (9${String(10 + (index % 8)).padStart(2, '0')}) ${100 + index}-${20 + index}-${30 + index}`
  }
  if (index % 3 === 0) {
    contacts.email = `info${index + 1}@example.com`
  }
  if (index % 4 !== 1) {
    contacts.telegram = `https://t.me/lead_${index + 1}`
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

function resolveLeadFieldsFromSourceUrl(
  url: string,
  source: LeadSource,
  niche: string,
): {
  name: string
  sourceUrl: string
  website?: string
  contacts: LeadContacts
} {
  const sourceUrl = normalizeExternalUrl(url)
  const contacts: LeadContacts = {}

  if (source === 'vk') {
    contacts.vk = sourceUrl
    return {
      name: buildFallbackLeadName('vk', niche),
      sourceUrl,
      contacts,
    }
  }

  return {
    name: buildFallbackLeadName(source, niche),
    sourceUrl,
    contacts,
  }
}

function buildDraftLead(
  params: Pick<AutoSearchParams, 'niche' | 'city'>,
  url: string,
  source: LeadSource,
  index: number,
): AutoSearchDraftLead {
  const niche = normalizeNicheName(params.niche)
  const resolved = resolveLeadFieldsFromSourceUrl(url, source, niche)
  const contacts = { ...mockContactsForIndex(index), ...resolved.contacts }

  const partialLead: Partial<Lead> = {
    name: resolved.name,
    niche,
    city: params.city,
    source,
    sourceUrl: resolved.sourceUrl,
    website: resolved.website,
    contacts,
  }
  const opportunities = suggestOpportunitiesFromLead(partialLead)
  const leadForMessage: Lead = {
    id: 'temp',
    name: resolved.name,
    niche,
    city: params.city,
    source,
    sourceUrl: resolved.sourceUrl,
    website: resolved.website,
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
    name: resolved.name,
    niche,
    city: params.city,
    source,
    sourceUrl: resolved.sourceUrl,
    website: resolved.website,
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
    sourceUrl: draft.sourceUrl,
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
    sourceUrl: draft.sourceUrl,
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
