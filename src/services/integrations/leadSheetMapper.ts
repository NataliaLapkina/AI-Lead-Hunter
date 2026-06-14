import type { Lead, LeadStatus, LeadSource, ImprovementOpportunity } from '@/domain/lead'
import { LEAD_SOURCES, LEAD_STATUSES, IMPROVEMENT_OPPORTUNITIES } from '@/lib/constants'

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
  'linkedin',
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
    lead.niche,
    lead.city,
    lead.source,
    lead.website ?? '',
    lead.contacts.emails.join(';'),
    lead.contacts.phones.join(';'),
    lead.contacts.telegram ?? '',
    lead.contacts.linkedin ?? '',
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

  const status = row[10] as LeadStatus
  const source = row[4] as LeadSource

  if (!LEAD_STATUSES.includes(status) || !LEAD_SOURCES.includes(source)) {
    return null
  }

  const opportunities = (row[12] ?? '')
    .split(';')
    .filter(Boolean)
    .filter((o): o is ImprovementOpportunity =>
      IMPROVEMENT_OPPORTUNITIES.includes(o as ImprovementOpportunity),
    )

  const now = new Date().toISOString()

  return {
    id: row[0],
    name: row[1] ?? '',
    niche: row[2] ?? '',
    city: row[3] ?? '',
    source,
    website: row[5] || undefined,
    contacts: {
      emails: (row[6] ?? '').split(';').filter(Boolean),
      phones: (row[7] ?? '').split(';').filter(Boolean),
      telegram: row[8] || undefined,
      linkedin: row[9] || undefined,
    },
    status,
    tags: (row[11] ?? '').split(';').filter(Boolean),
    opportunities,
    notes: row[13] ?? '',
    generatedMessage: row[14] || undefined,
    comments: [],
    createdAt: row[15] || now,
    updatedAt: row[16] || now,
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
