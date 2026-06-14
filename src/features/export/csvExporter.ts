import type { Lead } from '@/domain/lead'
import { getSourceLabel, getStatusLabel, getNicheLabel, ru } from '@/i18n/ru'
import { getOpportunityLabel } from '@/features/leads/improvements'
import { formatDateTime } from '@/lib/utils'

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function exportLeadsToCsv(leads: Lead[]): Blob {
  const headers = [
    'ID',
    ru.common.name,
    ru.common.niche,
    ru.common.city,
    ru.common.source,
    ru.common.website,
    'Email',
    ru.leads.formWhatsapp,
    ru.leads.formTelegram,
    ru.leads.formVk,
    ru.common.status,
    ru.common.tags,
    ru.leads.improvementsTitle,
    ru.common.notes,
    ru.common.createdAt,
    ru.common.updatedAt,
  ]

  const rows = leads.map((lead) => [
    lead.id,
    lead.name,
    getNicheLabel(lead.niche),
    lead.city,
    getSourceLabel(lead.source),
    lead.website ?? '',
    lead.contacts.email ?? '',
    lead.contacts.whatsapp ?? '',
    lead.contacts.telegram ?? '',
    lead.contacts.vk ?? '',
    getStatusLabel(lead.status),
    lead.tags.join('; '),
    (lead.opportunities ?? []).map(getOpportunityLabel).join('; '),
    lead.notes,
    formatDateTime(lead.createdAt),
    formatDateTime(lead.updatedAt),
  ])

  const BOM = '\uFEFF'
  const csv = [
    headers.map(escapeCsvField).join(','),
    ...rows.map((row) => row.map(String).map(escapeCsvField).join(',')),
  ].join('\n')

  return new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' })
}

export function getCsvFilename(): string {
  const date = new Date().toISOString().slice(0, 10)
  return `leads_${date}.csv`
}
