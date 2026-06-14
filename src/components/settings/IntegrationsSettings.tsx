import { useEffect, useState } from 'react'
import { ExternalLink, Loader2, RefreshCw, FileSpreadsheet, Upload, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useSettingsStore } from '@/stores'
import { useGoogleSheets } from '@/features/integrations/hooks/useGoogleSheets'
import { ru } from '@/i18n/ru'
import { toast } from 'sonner'
import { formatDateTime } from '@/lib/utils'
import { hasOpenAIKey } from '@/services/ai/openaiClient'

export function IntegrationsSettings() {
  const { settings, fetchSettings, updateSettings } = useSettingsStore()
  const sheets = useGoogleSheets()
  const [openaiKey, setOpenaiKey] = useState('')
  const [spreadsheetIdInput, setSpreadsheetIdInput] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  useEffect(() => {
    if (settings) {
      setOpenaiKey(settings.integrations.openaiApiKey ?? '')
      setSpreadsheetIdInput(settings.integrations.spreadsheetId ?? '')
    }
  }, [settings])

  if (!settings) return null

  const { integrations } = settings

  const saveOpenAI = async () => {
    await updateSettings({
      ...settings,
      integrations: { ...integrations, openaiApiKey: openaiKey.trim() || undefined },
    })
    toast.success(ru.settings.saved)
  }

  const saveSpreadsheetId = async () => {
    const id = spreadsheetIdInput.trim()
    await updateSettings({
      ...settings,
      integrations: {
        ...integrations,
        spreadsheetId: id || undefined,
        spreadsheetUrl: id
          ? `https://docs.google.com/spreadsheets/d/${id}`
          : undefined,
      },
    })
    toast.success(ru.settings.saved)
  }

  const handleConnect = async () => {
    try {
      await sheets.connect()
      await fetchSettings()
      toast.success(ru.settings.googleConnected)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : ru.toast.error)
    }
  }

  const handleCreateSheet = async () => {
    try {
      const created = await sheets.createSpreadsheet()
      await fetchSettings()
      toast.success(ru.settings.sheetCreated)
      window.open(created.spreadsheetUrl, '_blank')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : ru.toast.error)
    }
  }

  const handleSync = async () => {
    try {
      const result = await sheets.sync()
      await fetchSettings()
      toast.success(
        `Синхронизация: ${result.mergedCount} лидов (локально ${result.localCount}, в таблице ${result.remoteCount})`,
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : ru.toast.error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <p className="font-medium">{ru.settings.openai}</p>
          {hasOpenAIKey(openaiKey) && (
            <Badge variant="success" className="text-xs">
              {ru.settings.connected}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{ru.settings.openaiDescription}</p>
        <div className="space-y-2">
          <Label htmlFor="openai-key">API Key</Label>
          <Input
            id="openai-key"
            type="password"
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            placeholder="sk-..."
          />
        </div>
        <Button size="sm" onClick={saveOpenAI}>
          {ru.common.save}
        </Button>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <p className="font-medium">{ru.settings.googleSheets}</p>
          {integrations.googleSheetsConnected && (
            <Badge variant="success" className="text-xs">
              {ru.settings.connected}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {ru.settings.googleSheetsDescription}
        </p>

        {!sheets.isConfigured && (
          <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-900">
            {ru.settings.googleNotConfigured}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleConnect}
            disabled={!sheets.isConfigured || sheets.isLoading}
          >
            {sheets.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              ru.settings.googleConnect
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateSheet}
            disabled={!integrations.googleSheetsConnected || sheets.isLoading}
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {ru.settings.createSheet}
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sheet-id">{ru.settings.spreadsheetId}</Label>
          <Input
            id="sheet-id"
            value={spreadsheetIdInput}
            onChange={(e) => setSpreadsheetIdInput(e.target.value)}
            placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
          />
          <Button size="sm" variant="outline" onClick={saveSpreadsheetId}>
            {ru.settings.saveSpreadsheetId}
          </Button>
        </div>

        {integrations.spreadsheetUrl && (
          <a
            href={integrations.spreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            {ru.settings.openSheet}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}

        {integrations.lastSyncAt && (
          <p className="text-xs text-muted-foreground">
            {ru.settings.lastSync}: {formatDateTime(integrations.lastSyncAt)}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            onClick={handleSync}
            disabled={!integrations.spreadsheetId || sheets.isLoading}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {ru.settings.syncNow}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                await sheets.exportToSheet()
                toast.success(ru.settings.exportedToSheet)
              } catch (e) {
                toast.error(e instanceof Error ? e.message : ru.toast.error)
              }
            }}
            disabled={!integrations.spreadsheetId || sheets.isLoading}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {ru.settings.pushToSheet}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                await sheets.importFromSheet()
                toast.success(ru.settings.importedFromSheet)
              } catch (e) {
                toast.error(e instanceof Error ? e.message : ru.toast.error)
              }
            }}
            disabled={!integrations.spreadsheetId || sheets.isLoading}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {ru.settings.pullFromSheet}
          </Button>
        </div>
      </div>
    </div>
  )
}
