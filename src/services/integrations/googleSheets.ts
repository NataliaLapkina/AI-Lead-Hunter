import type { Lead } from '@/domain/lead'
import { SHEET_HEADERS, leadToSheetRow, sheetRowToLead, mergeLeads } from './leadSheetMapper'

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'
const LEADS_SHEET = 'Leads'
const DATA_RANGE = `${LEADS_SHEET}!A:Q`

async function sheetsRequest<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${SHEETS_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Google Sheets API: ${res.status} ${err}`)
  }

  return res.json() as Promise<T>
}

export interface CreateSpreadsheetResult {
  spreadsheetId: string
  spreadsheetUrl: string
}

export async function createLeadsSpreadsheet(
  token: string,
  title = 'AI Lead Hunter — Лиды',
): Promise<CreateSpreadsheetResult> {
  const body = {
    properties: { title },
    sheets: [
      {
        properties: { title: LEADS_SHEET, gridProperties: { frozenRowCount: 1 } },
      },
    ],
  }

  const data = await sheetsRequest<{
    spreadsheetId: string
    spreadsheetUrl: string
  }>('', token, { method: 'POST', body: JSON.stringify(body) })

  await sheetsRequest(
    `/${data.spreadsheetId}/values/${LEADS_SHEET}!A1:Q1?valueInputOption=RAW`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify({ values: [SHEET_HEADERS as unknown as string[]] }),
    },
  )

  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl,
  }
}

export async function readLeadsFromSheet(
  token: string,
  spreadsheetId: string,
): Promise<Lead[]> {
  const data = await sheetsRequest<{ values?: string[][] }>(
    `/${spreadsheetId}/values/${encodeURIComponent(DATA_RANGE)}`,
    token,
  )

  const rows = data.values ?? []
  if (rows.length <= 1) return []

  return rows
    .slice(1)
    .map((row, i) => sheetRowToLead(row, i + 2))
    .filter((l): l is Lead => l !== null)
}

export async function writeLeadsToSheet(
  token: string,
  spreadsheetId: string,
  leads: Lead[],
): Promise<void> {
  const values = [SHEET_HEADERS as unknown as string[], ...leads.map(leadToSheetRow)]

  await sheetsRequest(
    `/${spreadsheetId}/values/${encodeURIComponent(DATA_RANGE)}?valueInputOption=RAW`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify({ values }),
    },
  )
}

export interface SyncResult {
  localCount: number
  remoteCount: number
  mergedCount: number
  syncedAt: string
}

export function mergeLeadLists(localLeads: Lead[], remoteLeads: Lead[]): Lead[] {
  const map = new Map<string, Lead>()

  for (const lead of localLeads) {
    map.set(lead.id, lead)
  }

  for (const remote of remoteLeads) {
    const existing = map.get(remote.id)
    if (existing) {
      map.set(remote.id, mergeLeads(existing, remote))
    } else {
      map.set(remote.id, remote)
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

export async function syncLeadsWithSheet(
  token: string,
  spreadsheetId: string,
  localLeads: Lead[],
): Promise<{ merged: Lead[]; result: SyncResult }> {
  const remoteLeads = await readLeadsFromSheet(token, spreadsheetId)
  const merged = mergeLeadLists(localLeads, remoteLeads)
  await writeLeadsToSheet(token, spreadsheetId, merged)

  return {
    merged,
    result: {
      localCount: localLeads.length,
      remoteCount: remoteLeads.length,
      mergedCount: merged.length,
      syncedAt: new Date().toISOString(),
    },
  }
}

export async function exportLeadsToSheet(
  token: string,
  spreadsheetId: string,
  leads: Lead[],
): Promise<void> {
  await writeLeadsToSheet(token, spreadsheetId, leads)
}

export async function importLeadsFromSheet(
  token: string,
  spreadsheetId: string,
): Promise<Lead[]> {
  return readLeadsFromSheet(token, spreadsheetId)
}
