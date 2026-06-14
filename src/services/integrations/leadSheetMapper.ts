import type { Lead, LeadStatus, ImprovementOpportunity } from '@/domain/lead'
import { LEAD_STATUSES, IMPROVEMENT_OPPORTUNITIES } from '@/lib/constants'
import { resolveLeadSource } from '@/lib/leadSources'
import { getNicheLabel } from '@/i18n/ru'
import { normalizeNicheName } from '@/lib/nicheDisplay'

export const SHEET_HEADERS = [
  'id',
  'name',
  'niche',
  'city',
  'source',
  'website',
  'emails',
  'phones',
  'telegram',
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
    lead.contacts.emails.join(';'),
    lead.contacts.phones.join(';'),
    lead.contacts.telegram ?? '',
    lead.status,
    lead.tags.join(';'),
    (lead.opportunities ?? []).join(';'),
    lead.notes,
    lead.generatedMessage ?? '',
    lead.createdAt,
    lead.updatedAt,
  ]
}

export function sheetRowToLead(row: string[], rowIndex: number): Lead | null {
  if (!row[0]?.trim()) return null

  const status = row[9] as LeadStatus
  const source = resolveLeadSource(row[4])

  if (!LEAD_STATUSES.includes(status)) {
    return null
  }

  const opportunities = (row[11] ?? '')
    .split(';')
    .filter(Boolean)
    .filter((o): o is ImprovementOpportunity =>
      IMPROVEMENT_OPPORTUNITIES.includes(o as ImprovementOpportunity),
    )

  const now = new Date().toISOString()

  return {
    id: row[0],
    name: row[1] ?? '',
    niche: normalizeNicheName(row[2] ?? ''),
    city: row[3] ?? '',
    source,
    website: row[5] || undefined,
    contacts: {
      emails: (row[6] ?? '').split(';').filter(Boolean),
      phones: (row[7] ?? '').split(';').filter(Boolean),
      telegram: row[8] || undefined,
    },
    status,
    tags: (row[10] ?? '').split(';').filter(Boolean),
    opportunities,
    notes: row[12] ?? '',
    generatedMessage: row[13] || undefined,
    comments: [],
    createdAt: row[14] || now,
    updatedAt: row[15] || now,
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
