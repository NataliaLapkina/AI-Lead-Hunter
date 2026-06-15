import { useEffect, useState } from 'react'
import type { AIProfile, AppSettings } from '@/domain/lead'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DEFAULT_AI_PROFILE, normalizeAIProfile } from '@/lib/aiProfile'
import { ru } from '@/i18n/ru'
import { toast } from 'sonner'

interface AIProfileCardProps {
  settings: AppSettings
  onSave: (settings: AppSettings) => Promise<void>
}

export function AIProfileCard({ settings, onSave }: AIProfileCardProps) {
  const [aiProfile, setAiProfile] = useState<AIProfile>(DEFAULT_AI_PROFILE)

  useEffect(() => {
    setAiProfile(normalizeAIProfile(settings.aiProfile))
  }, [settings.aiProfile])

  const updateField = <K extends keyof AIProfile>(key: K, value: AIProfile[K]) => {
    setAiProfile((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    await onSave({
      ...settings,
      aiProfile: normalizeAIProfile(aiProfile),
    })
    toast.success(ru.settings.aiProfileSaved)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{ru.settings.aiProfile}</CardTitle>
        <CardDescription>{ru.settings.aiProfileDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ai-who-i-am">{ru.settings.aiWhoIAm}</Label>
          <Textarea
            id="ai-who-i-am"
            value={aiProfile.whoIAm}
            onChange={(e) => updateField('whoIAm', e.target.value)}
            placeholder={ru.settings.aiWhoIAmPlaceholder}
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ai-target-audience">{ru.settings.aiTargetAudience}</Label>
          <Textarea
            id="ai-target-audience"
            value={aiProfile.targetAudience}
            onChange={(e) => updateField('targetAudience', e.target.value)}
            placeholder={ru.settings.aiTargetAudiencePlaceholder}
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ai-advantages">{ru.settings.aiAdvantages}</Label>
          <Textarea
            id="ai-advantages"
            value={aiProfile.advantages}
            onChange={(e) => updateField('advantages', e.target.value)}
            placeholder={ru.settings.aiAdvantagesPlaceholder}
            rows={2}
          />
        </div>
        <Button onClick={() => void handleSave()}>{ru.common.save}</Button>
      </CardContent>
    </Card>
  )
}
