import { useEffect, useMemo, useState } from 'react'
import type { AISettings, AppProfile, AppSettings } from '@/domain/lead'
import { buildOutreachMessage } from '@/features/leads/outreachMessage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SettingsOptionGroup } from '@/components/settings/SettingsOptionGroup'
import {
  AI_COMMUNICATION_STYLES,
  AI_MESSAGE_GOALS,
  AI_MESSAGE_LENGTHS,
  AI_PREVIEW_SAMPLE_LEAD,
  AI_TONES,
  DEFAULT_AI_SETTINGS,
  normalizeAISettings,
} from '@/lib/aiMessageSettings'
import { normalizeAIProfile } from '@/lib/aiProfile'
import { buildSenderSignature } from '@/lib/senderProfile'
import { ru } from '@/i18n/ru'
import { toast } from 'sonner'

const STYLE_LABELS = {
  business: ru.settings.aiStyleBusiness,
  friendly: ru.settings.aiStyleFriendly,
  expert: ru.settings.aiStyleExpert,
  premium: ru.settings.aiStylePremium,
} as const

const LENGTH_LABELS = {
  short: ru.settings.aiLengthShort,
  medium: ru.settings.aiLengthMedium,
  detailed: ru.settings.aiLengthDetailed,
} as const

const GOAL_LABELS = {
  introduction: ru.settings.aiGoalIntroduction,
  followup: ru.settings.aiGoalFollowup,
  sell: ru.settings.aiGoalSell,
  contact_request: ru.settings.aiGoalContactRequest,
  reactivation: ru.settings.aiGoalReactivation,
} as const

const TONE_LABELS = {
  soft: ru.settings.aiToneSoft,
  neutral: ru.settings.aiToneNeutral,
  assertive: ru.settings.aiToneAssertive,
} as const

interface AISettingsCardProps {
  settings: AppSettings
  profile: AppProfile
  onSave: (settings: AppSettings) => Promise<void>
}

export function AISettingsCard({ settings, profile, onSave }: AISettingsCardProps) {
  const [aiSettings, setAiSettings] = useState<AISettings>(DEFAULT_AI_SETTINGS)

  useEffect(() => {
    setAiSettings(normalizeAISettings(settings.aiSettings))
  }, [settings.aiSettings])

  const updateField = <K extends keyof AISettings>(key: K, value: AISettings[K]) => {
    setAiSettings((prev) => ({ ...prev, [key]: value }))
  }

  const aiProfile = useMemo(
    () => normalizeAIProfile(settings.aiProfile),
    [settings.aiProfile],
  )

  const previewMessage = useMemo(
    () =>
      buildOutreachMessage(AI_PREVIEW_SAMPLE_LEAD, profile, aiSettings, aiProfile),
    [profile, aiSettings, aiProfile],
  )

  const signaturePreview = useMemo(() => buildSenderSignature(profile), [profile])

  const handleSave = async () => {
    await onSave({
      ...settings,
      aiSettings: normalizeAISettings(aiSettings),
    })
    toast.success(ru.settings.aiSettingsSaved)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{ru.settings.aiSettings}</CardTitle>
        <CardDescription>{ru.settings.aiSettingsDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <SettingsOptionGroup
          label={ru.settings.aiCommunicationStyle}
          value={aiSettings.communicationStyle}
          options={AI_COMMUNICATION_STYLES}
          labels={STYLE_LABELS}
          onChange={(value) => updateField('communicationStyle', value)}
          columns={4}
        />

        <SettingsOptionGroup
          label={ru.settings.aiTone}
          value={aiSettings.tone}
          options={AI_TONES}
          labels={TONE_LABELS}
          onChange={(value) => updateField('tone', value)}
          columns={3}
        />

        <SettingsOptionGroup
          label={ru.settings.aiMessageLength}
          value={aiSettings.messageLength}
          options={AI_MESSAGE_LENGTHS}
          labels={LENGTH_LABELS}
          onChange={(value) => updateField('messageLength', value)}
          columns={3}
        />

        <SettingsOptionGroup
          label={ru.settings.aiMessageGoal}
          value={aiSettings.messageGoal}
          options={AI_MESSAGE_GOALS}
          labels={GOAL_LABELS}
          onChange={(value) => updateField('messageGoal', value)}
          columns={2}
        />

        <div className="space-y-2">
          <Label htmlFor="ai-offer-topic">{ru.settings.aiOfferTopic}</Label>
          <Input
            id="ai-offer-topic"
            value={aiSettings.offerTopic}
            onChange={(e) => updateField('offerTopic', e.target.value)}
            placeholder={ru.settings.aiOfferTopicPlaceholder}
          />
        </div>

        <div className="space-y-3 rounded-lg border p-3">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-input"
              checked={aiSettings.useAutoSignature}
              onChange={(e) => updateField('useAutoSignature', e.target.checked)}
            />
            <span>
              <span className="block text-sm font-medium">{ru.settings.aiAutoSignature}</span>
              <span className="block text-xs text-muted-foreground">
                {ru.settings.aiAutoSignatureDescription}
              </span>
            </span>
          </label>
          {aiSettings.useAutoSignature && (
            <div className="space-y-2 rounded-lg bg-muted/40 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                {ru.settings.profileSignaturePreview}
              </p>
              <pre className="whitespace-pre-wrap text-sm font-sans">{signaturePreview}</pre>
            </div>
          )}
        </div>

        <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
          <div>
            <p className="text-sm font-medium">{ru.settings.aiMessagePreview}</p>
            <p className="text-xs text-muted-foreground">{ru.settings.aiMessagePreviewHint}</p>
          </div>
          <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap text-sm font-sans">
            {previewMessage}
          </pre>
        </div>

        <Button onClick={() => void handleSave()}>{ru.common.save}</Button>
      </CardContent>
    </Card>
  )
}
