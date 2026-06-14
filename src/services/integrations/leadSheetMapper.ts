import type { Lead, LeadStatus, ImprovementOpportunity } from '@/domain/lead'
import { LEAD_STATUSES, IMPROVEMENT_OPPORTUNITIES } from '@/lib/constants'
import { resolveLeadSource } from '@/lib/leadSources'
import { getNicheLabel } from '@/i18n/ru'
import { normalizeNicheName } from '@/lib/nicheDisplay'
import { migrateLegacyContacts } from '@/lib/leadContacts'
import { isSourcePlatformUrl } from '@/lib/leadLinks'

export const SHEET_HEADERS = [
  'id',
  'name',
  'niche',
  'city',
  'source',
  'website',
  'sourceUrl',
  'email',
  'phone',
  'telegram',
  'vk',
  'status',
  'tags',
  'opportunities',
  'notes',
  'generatedMessage',
  'createdAt',
  'updatedAt',
] as const

export function leadToSheetRow(lead: Lead): string[] {
  return [
    lead.id,
    lead.name,
    getNicheLabel(lead.niche),
    lead.city,
    lead.source,
    lead.website ?? '',
    lead.sourceUrl ?? '',
    lead.contacts.email ?? '',
    lead.contacts.phone ?? '',
    lead.contacts.telegram ?? '',
    lead.contacts.vk ?? '',
    lead.status,
    lead.tags.join(';'),
    (lead.opportunities ?? []).join(';'),
    lead.notes,
    lead.generatedMessage ?? '',
    lead.createdAt,
    lead.updatedAt,
  ]
}

function isNewFormatRow(row: string[]): boolean {
  return row.length >= 18 || Boolean(row[6]?.includes('.'))
}

export function sheetRowToLead(row: string[], rowIndex: number): Lead | null {
  if (!row[0]?.trim()) return null

  const newFormat = isNewFormatRow(row)
  const statusIndex = newFormat ? 11 : 9
  const status = row[statusIndex] as LeadStatus
  const source = resolveLeadSource(row[4])

  if (!LEAD_STATUSES.includes(status)) {
    return null
  }

  const opportunitiesIndex = newFormat ? 13 : 11
  const opportunities = (row[opportunitiesIndex] ?? '')
    .split(';')
    .filter(Boolean)
    .filter((o): o is ImprovementOpportunity =>
      IMPROVEMENT_OPPORTUNITIES.includes(o as ImprovementOpportunity),
    )

  const now = new Date().toISOString()

  let website = row[5] || undefined
  let sourceUrl = newFormat ? row[6] || undefined : undefined

  if (!newFormat && website && isSourcePlatformUrl(website)) {
    sourceUrl = website
    website = undefined
  }

  const contacts = newFormat
    ? migrateLegacyContacts({
        email: row[7] || undefined,
        phone: row[8] || undefined,
        telegram: row[9] || undefined,
        vk: row[10] || undefined,
      })
    : migrateLegacyContacts({
        emails: (row[6] ?? '').split(';').filter(Boolean),
        phones: (row[7] ?? '').split(';').filter(Boolean),
        telegram: row[8] || undefined,
      })

  return {
    id: row[0],
    name: row[1] ?? '',
    niche: normalizeNicheName(row[2] ?? ''),
    city: row[3] ?? '',
    source,
    website,
    sourceUrl,
    contacts,
    status,
    tags: (row[newFormat ? 12 : 10] ?? '').split(';').filter(Boolean),
    opportunities,
    notes: row[newFormat ? 14 : 12] ?? '',
    generatedMessage: row[newFormat ? 15 : 13] || undefined,
    comments: [],
    createdAt: row[newFormat ? 16 : 14] || now,
    updatedAt: row[newFormat ? 17 : 15] || now,
    activityLog: [],
    sheetsRowIndex: rowIndex,
  }
}

export function mergeLeads(local: Lead, remote: Lead): Lead {
  const localTime = new Date(local.updatedAt).getTime()
  const remoteTime = new Date(remote.updatedAt).getTime()
  const winner = remoteTime > localTime ? remote : local
  const loser = winner === remote ? local : remote

  return {
    ...winner,
    comments: winner.comments?.length ? winner.comments : loser.comments ?? [],
    opportunities: winner.opportunities?.length
      ? winner.opportunities
      : loser.opportunities ?? [],
    generatedMessage: winner.generatedMessage ?? loser.generatedMessage,
    siteAudit: winner.siteAudit ?? loser.siteAudit,
    activityLog:
      (local.activityLog?.length ?? 0) >= (remote.activityLog?.length ?? 0)
        ? local.activityLog
        : remote.activityLog,
  }
}
