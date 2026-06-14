import type { Lead, ImportResult } from '@/domain/lead'
import { LEAD_STATUSES } from '@/lib/constants'
import { resolveLeadSource } from '@/lib/leadSources'
import { migrateLegacyContacts } from '@/lib/leadContacts'
import { normalizeNicheName } from '@/lib/nicheDisplay'
import { generateId } from '@/lib/utils'

interface JsonExportPayload {
  version: number
  exportedAt: string
  leads: Lead[]
}

export function exportLeadsToJson(leads: Lead[]): Blob {
  const payload: JsonExportPayload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    leads,
  }
  return new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
}

export function getJsonFilename(): string {
  const date = new Date().toISOString().slice(0, 10)
  return `leads_backup_${date}.json`
}

function isValidLead(obj: unknown): obj is Lead {
  if (!obj || typeof obj !== 'object') return false
  const lead = obj as Record<string, unknown>
  return (
    typeof lead.name === 'string' &&
    typeof lead.niche === 'string' &&
    LEAD_STATUSES.includes(lead.status as Lead['status'])
  )
}

function normalizeImportedLead(raw: Lead): Lead {
  const now = new Date().toISOString()
  const legacy = raw.contacts as { linkedin?: string } | undefined

  return {
    ...raw,
    id: raw.id || generateId(),
    city: raw.city ?? '',
    notes: raw.notes ?? '',
    tags: raw.tags ?? [],
    opportunities: raw.opportunities ?? [],
    comments: raw.comments ?? [],
    source: resolveLeadSource(raw.source),
    niche: normalizeNicheName(raw.niche),
    contacts: migrateLegacyContacts({
      ...raw.contacts,
      telegram: raw.contacts?.telegram ?? legacy?.linkedin,
    }),
    activityLog: raw.activityLog?.length
      ? raw.activityLog
      : [
          {
            id: generateId(),
            type: 'imported',
            timestamp: now,
            payload: {},
          },
        ],
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now,
  }
}

export async function parseLeadsFromJson(file: File): Promise<{
  leads: Lead[]
  errors: string[]
}> {
  const errors: string[] = []

  try {
    const text = await file.text()
    const parsed = JSON.parse(text) as unknown

    if (Array.isArray(parsed)) {
      const leads = parsed.filter(isValidLead).map(normalizeImportedLead)
      if (leads.length === 0) errors.push('Файл не содержит валидных лидов')
      return { leads, errors }
    }

    if (parsed && typeof parsed === 'object' && 'leads' in parsed) {
      const payload = parsed as JsonExportPayload
      if (!Array.isArray(payload.leads)) {
        errors.push('Неверный формат: поле leads должно быть массивом')
        return { leads: [], errors }
      }
      const leads = payload.leads.filter(isValidLead).map(normalizeImportedLead)
      if (leads.length === 0) errors.push('Файл не содержит валидных лидов')
      return { leads, errors }
    }

    errors.push('Неверный формат JSON файла')
    return { leads: [], errors }
  } catch {
    errors.push('Не удалось прочитать JSON файл')
    return { leads: [], errors }
  }
}

export function formatImportResult(result: ImportResult): string {
  return `Импортировано: ${result.imported}, пропущено: ${result.skipped}`
}
