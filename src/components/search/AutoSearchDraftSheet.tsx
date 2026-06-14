import { useEffect, useState } from 'react'
import type { AutoSearchDraftLead, ImprovementOpportunity } from '@/domain/lead'
import { IMPROVEMENT_OPPORTUNITIES } from '@/lib/constants'
import { getSourceLabel, ru } from '@/i18n/ru'
import { getOpportunityLabel } from '@/features/leads/improvements'
import { regenerateDraftMessage } from '@/services/search/autoLeadSearchService'
import { normalizeNicheName } from '@/lib/nicheDisplay'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

interface AutoSearchDraftSheetProps {
  draft: AutoSearchDraftLead | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (draft: AutoSearchDraftLead) => void
}

export function AutoSearchDraftSheet({
  draft,
  open,
  onOpenChange,
  onSave,
}: AutoSearchDraftSheetProps) {
  const [form, setForm] = useState<AutoSearchDraftLead | null>(null)

  useEffect(() => {
    setForm(draft ? { ...draft } : null)
  }, [draft])

  if (!form) return null

  const toggleOpportunity = (key: ImprovementOpportunity) => {
    setForm((prev) => {
      if (!prev) return prev
      const has = prev.opportunities.includes(key)
      const opportunities = has
        ? prev.opportunities.filter((o) => o !== key)
        : [...prev.opportunities, key]
      return { ...prev, opportunities }
    })
  }

  const handleRegenerateMessage = () => {
    setForm((prev) => {
      if (!prev) return prev
      return { ...prev, generatedMessage: regenerateDraftMessage(prev) }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...form,
      niche: normalizeNicheName(form.niche),
      name: form.name.trim(),
    })
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{ru.autoSearch.editDraft}</SheetTitle>
          <SheetDescription>{form.name}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="draft-name">{ru.autoSearch.columnName}</Label>
            <Input
              id="draft-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="draft-niche">{ru.common.niche}</Label>
              <Input
                id="draft-niche"
                value={form.niche}
                onChange={(e) => setForm({ ...form, niche: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="draft-city">{ru.common.city}</Label>
              <Input
                id="draft-city"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{ru.common.source}</Label>
            <Select
              value={form.source}
              onValueChange={(v) =>
                setForm({ ...form, source: v as AutoSearchDraftLead['source'] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={form.source}>{getSourceLabel(form.source)}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="draft-website">{ru.common.website}</Label>
            <Input
              id="draft-website"
              value={form.website ?? ''}
              onChange={(e) => setForm({ ...form, website: e.target.value || undefined })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="draft-phone">Телефон</Label>
              <Input
                id="draft-phone"
                value={form.contacts.phones[0] ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    contacts: {
                      ...form.contacts,
                      phones: e.target.value ? [e.target.value] : [],
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="draft-email">Email</Label>
              <Input
                id="draft-email"
                type="email"
                value={form.contacts.emails[0] ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    contacts: {
                      ...form.contacts,
                      emails: e.target.value ? [e.target.value] : [],
                    },
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="draft-telegram">Telegram / VK</Label>
            <Input
              id="draft-telegram"
              value={form.contacts.telegram ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  contacts: { ...form.contacts, telegram: e.target.value || undefined },
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>{ru.autoSearch.opportunitiesLabel}</Label>
            <div className="space-y-2 rounded-lg border p-3">
              {IMPROVEMENT_OPPORTUNITIES.map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={form.opportunities.includes(key)}
                    onChange={() => toggleOpportunity(key)}
                  />
                  {getOpportunityLabel(key)}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="draft-message">{ru.autoSearch.messageLabel}</Label>
              <Button type="button" variant="ghost" size="sm" onClick={handleRegenerateMessage}>
                Обновить
              </Button>
            </div>
            <Textarea
              id="draft-message"
              value={form.generatedMessage}
              onChange={(e) => setForm({ ...form, generatedMessage: e.target.value })}
              rows={10}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1">
              {ru.common.save}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {ru.common.cancel}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
