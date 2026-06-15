import { useEffect, useState, useRef } from 'react'
import { Loader2, Download, Upload, Trash2, Plus, X } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { IntegrationsSettings } from '@/components/settings/IntegrationsSettings'
import { AIProfileCard } from '@/components/settings/AIProfileCard'
import { AISettingsCard } from '@/components/settings/AISettingsCard'
import { ThemeModeSelect } from '@/components/theme/ThemeModeSelect'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useSettingsStore } from '@/stores'
import { useLeadStore } from '@/stores'
import { repositories } from '@/repositories'
import { clearAllAppData } from '@/lib/storage'
import { exportLeadsToJson, getJsonFilename, parseLeadsFromJson } from '@/features/export/jsonExporter'
import { downloadBlob } from '@/lib/utils'
import { ru, getNicheLabel } from '@/i18n/ru'
import { toast } from 'sonner'
import type { AppProfile } from '@/domain/lead'
import { createDefaultAppProfile, buildSenderSignature } from '@/lib/senderProfile'

export function SettingsPage() {
  const { settings, isLoading, fetchSettings, updateSettings } = useSettingsStore()
  const { fetchLeads } = useLeadStore()
  const [profile, setProfile] = useState<AppProfile>(createDefaultAppProfile())
  const [newNiche, setNewNiche] = useState('')
  const [isAddingNiche, setIsAddingNiche] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  useEffect(() => {
    if (settings) {
      setProfile(settings.profile)
    }
  }, [settings])

  const updateProfileField = <K extends keyof AppProfile>(key: K, value: AppProfile[K]) => {
    setProfile((prev) => ({ ...prev, [key]: value }))
  }

  const handleSaveProfile = async () => {
    if (!settings) return
    await updateSettings({
      ...settings,
      profile,
    })
    toast.success(ru.settings.saved)
  }

  const handleAddNiche = async () => {
    const trimmed = newNiche.trim()
    if (!trimmed) return

    setIsAddingNiche(true)
    try {
      await repositories.settings.addNichePreset(trimmed)
      await fetchSettings()
      setNewNiche('')
      toast.success(ru.settings.nicheAdded)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : ru.toast.error)
    } finally {
      setIsAddingNiche(false)
    }
  }

  const handleRemoveNiche = async (id: string) => {
    try {
      await repositories.settings.removeNichePreset(id)
      await fetchSettings()
      toast.success(ru.settings.nicheRemoved)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : ru.toast.error)
    }
  }

  const handleExportJson = async () => {
    const leads = await repositories.leads.getAll()
    const blob = exportLeadsToJson(leads)
    downloadBlob(blob, getJsonFilename())
    toast.success(ru.toast.exportSuccess)
  }

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const { leads, errors } = await parseLeadsFromJson(file)
    if (errors.length > 0 && leads.length === 0) {
      toast.error(errors[0])
      return
    }

    const result = await repositories.leads.importLeads(leads)
    await fetchLeads()
    toast.success(`Импортировано: ${result.imported}, пропущено: ${result.skipped}`)

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClearData = async () => {
    clearAllAppData()
    await repositories.settings.reset()
    await fetchSettings()
    await fetchLeads()
    setClearOpen(false)
    toast.success('Данные очищены')
  }

  if (isLoading && !settings) {
    return (
      <AppShell title={ru.settings.title} subtitle={ru.settings.subtitle}>
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>{ru.common.loading}</span>
        </div>
      </AppShell>
    )
  }

  if (!settings) return null

  const defaultPresets = settings.nichePresets.filter((p) => p.isDefault)
  const customPresets = settings.nichePresets.filter((p) => !p.isDefault)

  return (
    <>
      <AppShell title={ru.settings.title} subtitle={ru.settings.subtitle}>
        <div className="mx-auto max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{ru.settings.theme}</CardTitle>
              <CardDescription>{ru.settings.themeDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <ThemeModeSelect />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{ru.settings.myContacts}</CardTitle>
              <CardDescription>{ru.settings.profileDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profile-name">{ru.settings.profileName}</Label>
                  <Input
                    id="profile-name"
                    value={profile.name}
                    onChange={(e) => updateProfileField('name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-last-name">{ru.settings.profileLastName}</Label>
                  <Input
                    id="profile-last-name"
                    value={profile.lastName}
                    onChange={(e) => updateProfileField('lastName', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-specialization">{ru.settings.profileSpecialization}</Label>
                <Input
                  id="profile-specialization"
                  value={profile.specialization}
                  onChange={(e) => updateProfileField('specialization', e.target.value)}
                  placeholder={ru.settings.profileSpecializationPlaceholder}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profile-phone">{ru.settings.profilePhone}</Label>
                  <Input
                    id="profile-phone"
                    value={profile.phone}
                    onChange={(e) => updateProfileField('phone', e.target.value)}
                    placeholder="+7 ..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-whatsapp">{ru.settings.profileWhatsApp}</Label>
                  <Input
                    id="profile-whatsapp"
                    value={profile.whatsapp}
                    onChange={(e) => updateProfileField('whatsapp', e.target.value)}
                    placeholder="+7 ... или @username"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profile-telegram">{ru.settings.profileTelegram}</Label>
                  <Input
                    id="profile-telegram"
                    value={profile.telegram}
                    onChange={(e) => updateProfileField('telegram', e.target.value)}
                    placeholder="@username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-vk">{ru.settings.profileVk}</Label>
                  <Input
                    id="profile-vk"
                    value={profile.vk}
                    onChange={(e) => updateProfileField('vk', e.target.value)}
                    placeholder="vk.com/..."
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profile-email">{ru.settings.profileEmail}</Label>
                  <Input
                    id="profile-email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => updateProfileField('email', e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-website">{ru.settings.profileWebsite}</Label>
                  <Input
                    id="profile-website"
                    value={profile.website}
                    onChange={(e) => updateProfileField('website', e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-portfolio">{ru.settings.profilePortfolio}</Label>
                <Input
                  id="profile-portfolio"
                  value={profile.portfolio}
                  onChange={(e) => updateProfileField('portfolio', e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {ru.settings.profileSignaturePreview}
                </p>
                <pre className="whitespace-pre-wrap text-sm font-sans">
                  {buildSenderSignature(profile)}
                </pre>
              </div>
              <Button onClick={handleSaveProfile}>{ru.common.save}</Button>
            </CardContent>
          </Card>

          <AIProfileCard settings={settings} onSave={updateSettings} />

          <AISettingsCard
            settings={settings}
            profile={profile}
            onSave={updateSettings}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{ru.settings.niches}</CardTitle>
              <CardDescription>{ru.settings.nichesDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-medium">{ru.settings.nichesDefault}</p>
                <p className="text-xs text-muted-foreground">{ru.settings.nichesDefaultHint}</p>
                <div className="flex flex-wrap gap-2">
                  {defaultPresets.map((preset) => (
                    <Badge
                      key={preset.id}
                      variant="muted"
                      className="pointer-events-none select-none px-3 py-1 font-normal"
                    >
                      {getNicheLabel(preset.name)}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">{ru.settings.nichesCustom}</p>
                <div className="flex flex-wrap gap-2">
                  {customPresets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Нет пользовательских ниш</p>
                  ) : (
                    customPresets.map((preset) => (
                      <Badge
                        key={preset.id}
                        variant="outline"
                        className="gap-1 px-2 py-1 pr-1 font-normal"
                      >
                        <span>{getNicheLabel(preset.name)}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 shrink-0 hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Удалить нишу ${preset.name}`}
                          onClick={() => handleRemoveNiche(preset.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="new-niche"
                  value={newNiche}
                  onChange={(e) => setNewNiche(e.target.value)}
                  placeholder="Название ниши"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void handleAddNiche()
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleAddNiche()}
                  disabled={!newNiche.trim() || isAddingNiche}
                  className="gap-2 sm:shrink-0"
                >
                  {isAddingNiche ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {ru.settings.addNiche}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{ru.settings.dataManagement}</CardTitle>
              <CardDescription>{ru.settings.dataDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportJson}
              />
              <Button variant="outline" onClick={handleExportJson} className="w-full gap-2">
                <Download className="h-4 w-4" />
                {ru.settings.exportJson}
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full gap-2"
              >
                <Upload className="h-4 w-4" />
                {ru.settings.importJson}
              </Button>
              <Separator />
              <Button
                variant="destructive"
                onClick={() => setClearOpen(true)}
                className="w-full gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {ru.settings.clearData}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{ru.settings.integrations}</CardTitle>
              <CardDescription>{ru.settings.integrationsDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <IntegrationsSettings />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{ru.settings.plan}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary" className="text-sm">
                {ru.settings.planFree}
              </Badge>
            </CardContent>
          </Card>
        </div>
      </AppShell>

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ru.settings.clearData}</AlertDialogTitle>
            <AlertDialogDescription>{ru.settings.clearConfirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{ru.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearData}>{ru.common.confirm}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
