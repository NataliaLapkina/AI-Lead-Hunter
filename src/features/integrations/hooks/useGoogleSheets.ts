import { useCallback, useState } from 'react'
import type { Lead, AppSettings } from '@/domain/lead'
import { repositories } from '@/repositories'
import {
  createLeadsSpreadsheet,
  syncLeadsWithSheet,
  exportLeadsToSheet,
  importLeadsFromSheet,
} from '@/services/integrations/googleSheets'
import {
  requestGoogleAccessToken,
  isTokenValid,
  isGoogleConfigured,
} from '@/services/integrations/googleAuth'
import { useLeadStore } from '@/stores'

async function ensureToken(settings: AppSettings): Promise<{
  token: string
  settings: AppSettings
}> {
  let integrations = { ...settings.integrations }

  if (!isTokenValid(integrations.googleTokenExpiry)) {
    const { accessToken, expiresAt } = await requestGoogleAccessToken()
    integrations = {
      ...integrations,
      googleAccessToken: accessToken,
      googleTokenExpiry: expiresAt,
      googleSheetsConnected: true,
    }
    const updated = { ...settings, integrations }
    await repositories.settings.save(updated)
    return { token: accessToken, settings: updated }
  }

  return { token: integrations.googleAccessToken!, settings }
}

export function useGoogleSheets() {
  const { refreshLeads } = useLeadStore()
  const [isLoading, setIsLoading] = useState(false)

  const connect = useCallback(async () => {
    setIsLoading(true)
    try {
      const settings = await repositories.settings.get()
      const { accessToken, expiresAt } = await requestGoogleAccessToken()
      await repositories.settings.save({
        ...settings,
        integrations: {
          ...settings.integrations,
          googleAccessToken: accessToken,
          googleTokenExpiry: expiresAt,
          googleSheetsConnected: true,
        },
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createSpreadsheet = useCallback(async () => {
    setIsLoading(true)
    try {
      const settings = await repositories.settings.get()
      const { token, settings: withToken } = await ensureToken(settings)
      const created = await createLeadsSpreadsheet(token)
      await repositories.settings.save({
        ...withToken,
        integrations: {
          ...withToken.integrations,
          spreadsheetId: created.spreadsheetId,
          spreadsheetUrl: created.spreadsheetUrl,
        },
      })
      return created
    } finally {
      setIsLoading(false)
    }
  }, [])

  const sync = useCallback(async () => {
    setIsLoading(true)
    try {
      const settings = await repositories.settings.get()
      const spreadsheetId = settings.integrations.spreadsheetId
      if (!spreadsheetId) throw new Error('Таблица не подключена')

      const { token, settings: withToken } = await ensureToken(settings)
      const localLeads = await repositories.leads.getAll()
      const { merged, result } = await syncLeadsWithSheet(token, spreadsheetId, localLeads)

      await repositories.leads.replaceAll(merged)

      await repositories.settings.save({
        ...withToken,
        integrations: {
          ...withToken.integrations,
          lastSyncAt: result.syncedAt,
        },
      })

      await refreshLeads()
      return result
    } finally {
      setIsLoading(false)
    }
  }, [refreshLeads])

  const exportToSheet = useCallback(async () => {
    setIsLoading(true)
    try {
      const settings = await repositories.settings.get()
      const spreadsheetId = settings.integrations.spreadsheetId
      if (!spreadsheetId) throw new Error('Таблица не подключена')

      const { token } = await ensureToken(settings)
      const leads = await repositories.leads.getAll()
      await exportLeadsToSheet(token, spreadsheetId, leads)

      await repositories.settings.save({
        ...settings,
        integrations: {
          ...settings.integrations,
          lastSyncAt: new Date().toISOString(),
        },
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  const importFromSheet = useCallback(async (): Promise<Lead[]> => {
    setIsLoading(true)
    try {
      const settings = await repositories.settings.get()
      const spreadsheetId = settings.integrations.spreadsheetId
      if (!spreadsheetId) throw new Error('Таблица не подключена')

      const { token } = await ensureToken(settings)
      const imported = await importLeadsFromSheet(token, spreadsheetId)
      await repositories.leads.importLeads(imported)
      await refreshLeads()
      return imported
    } finally {
      setIsLoading(false)
    }
  }, [refreshLeads])

  return {
    isLoading,
    isConfigured: isGoogleConfigured(),
    connect,
    createSpreadsheet,
    sync,
    exportToSheet,
    importFromSheet,
  }
}
