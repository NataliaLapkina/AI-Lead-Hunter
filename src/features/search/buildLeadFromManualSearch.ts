import type {
  CreateLeadInput,
  LeadSource,
  SearchPlatform,
  SearchQuery,
  SiteAuditResult,
} from '@/domain/lead'
import { suggestOpportunitiesFromLead } from '@/features/leads/improvements'
import { getPlatformLabel } from '@/i18n/ru'
import { splitWebsiteAndSourceUrl, buildFallbackLeadName } from '@/lib/leadLinks'
import { normalizeNicheName } from '@/lib/nicheDisplay'
import { normalizeLeadContacts } from '@/lib/leadContacts'
import { parseLeadFragmentsFromText } from '@/lib/normalizeLeadInput'

export interface ManualSearchLeadBuildResult {
  input: CreateLeadInput
  siteAudit?: SiteAuditResult
}

function resolveSourceFromQuery(query: SearchQuery, detectedSource?: LeadSource): LeadSource {
  if (
    detectedSource &&
    detectedSource !== 'other' &&
    detectedSource !== 'company_site'
  ) {
    return detectedSource
  }

  const platformSource = mapPlatformToSource(query.platform)
  if (platformSource !== 'other') return platformSource

  if (query.source) return query.source

  return 'other'
}

function mapPlatformToSource(platform: SearchPlatform): LeadSource {
  switch (platform) {
    case 'vk':
      return 'vk'
    case 'telegram':
      return 'telegram'
    default:
      return 'other'
  }
}

function buildManualSearchNotes(query: SearchQuery, foundText?: string): string {
  const platformLabel = getPlatformLabel(query.platform)
  const lines = [
    'Найден в ручном поиске.',
    `Запрос: «${query.query.trim()}».`,
    `Платформа: ${platformLabel}.`,
  ]

  if (foundText?.trim()) {
    lines.push(`Исходные данные: ${foundText.trim()}`)
  }

  return lines.join('\n')
}

function createStarterSiteAudit(website: string, niche: string): SiteAuditResult {
  const now = new Date().toISOString()
  return {
    url: website,
    auditedAt: now,
    score: 0,
    summary: `Стартовый аудит для «${niche}». Запустите полный анализ в карточке лида.`,
    findings: [],
  }
}

export function buildCreateLeadInputFromManualSearch(
  query: SearchQuery,
  foundText?: string,
): ManualSearchLeadBuildResult | null {
  const niche = normalizeNicheName(query.niche.trim())
  if (!niche) return null

  const city = query.city?.trim() ?? ''
  const parsed = foundText?.trim()
    ? parseLeadFragmentsFromText(foundText, query.source ?? 'other')
    : { contacts: {} as CreateLeadInput['contacts'] }

  const source = resolveSourceFromQuery(query, parsed.detectedSource)
  const links = splitWebsiteAndSourceUrl(parsed.website, parsed.sourceUrl)

  const name =
    parsed.name ??
    buildFallbackLeadName(source, niche)

  const contacts = normalizeLeadContacts(parsed.contacts)

  const partialLead = {
    name,
    niche,
    city,
    source,
    website: links.website,
    sourceUrl: links.sourceUrl,
    contacts,
  }

  const opportunities = suggestOpportunitiesFromLead(partialLead)
  const input: CreateLeadInput = {
    ...partialLead,
    notes: buildManualSearchNotes(query, foundText),
    tags: ['ручной-поиск'],
    opportunities,
    status: 'new',
  }

  const siteAudit = links.website ? createStarterSiteAudit(links.website, niche) : undefined

  return { input, siteAudit }
}
