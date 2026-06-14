import { useState, useEffect } from 'react'
import type { Lead, CreateLeadInput, ImprovementOpportunity } from '@/domain/lead'
import { LEAD_SOURCES } from '@/lib/constants'
import { createLeadSchema } from '@/domain/validation'
import { getSourceLabel, ru } from '@/i18n/ru'
import { normalizeNicheName } from '@/lib/nicheDisplay'
import { createEmptyContacts } from '@/domain/leadFactory'
import { suggestOpportunitiesFromLead } from '@/features/leads/improvements'
import { ImprovementChecklist } from '@/components/leads/ImprovementChecklist'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
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
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'

interface LeadFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead?: Lead | null
  initialValues?: Partial<CreateLeadInput>
  onSubmit: (data: CreateLeadInput) => Promise<void>
  onCheckDuplicates?: (website?: string, email?: string) => Promise<Lead[]>
}

export function LeadForm({
  open,
  onOpenChange,
  lead,
  initialValues,
  onSubmit,
  onCheckDuplicates,
}: LeadFormProps) {
  const [name, setName] = useState('')
  const [niche, setNiche] = useState('')
  const [city, setCity] = useState('')
  const [source, setSource] = useState<CreateLeadInput['source']>('other')
  const [website, setWebsite] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [telegram, setTelegram] = useState('')
  const [vk, setVk] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [opportunities, setOpportunities] = useState<ImprovementOpportunity[]>([])
  const [tagInput, setTagInput] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [duplicateWarning, setDuplicateWarning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      if (lead) {
        setName(lead.name)
        setNiche(normalizeNicheName(lead.niche))
        setCity(lead.city)
        setSource(lead.source)
        setWebsite(lead.website ?? '')
        setSourceUrl(lead.sourceUrl ?? '')
        setEmail(lead.contacts.email ?? '')
        setPhone(lead.contacts.phone ?? '')
        setTelegram(lead.contacts.telegram ?? '')
        setVk(lead.contacts.vk ?? '')
        setNotes(lead.notes)
        setTags(lead.tags)
        setOpportunities(lead.opportunities ?? [])
      } else {
        setName(initialValues?.name ?? '')
        setNiche(normalizeNicheName(initialValues?.niche ?? ''))
        setCity(initialValues?.city ?? '')
        setSource(initialValues?.source ?? 'other')
        setWebsite(initialValues?.website ?? '')
        setSourceUrl(initialValues?.sourceUrl ?? '')
        setEmail(initialValues?.contacts?.email ?? '')
        setPhone(initialValues?.contacts?.phone ?? '')
        setTelegram(initialValues?.contacts?.telegram ?? '')
        setVk(initialValues?.contacts?.vk ?? '')
        setNotes(initialValues?.notes ?? '')
        setTags(initialValues?.tags ?? [])
        setOpportunities(initialValues?.opportunities ?? [])
      }
      setErrors({})
      setDuplicateWarning(false)
    }
  }, [open, lead, initialValues])

  const addTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const buildContacts = () => ({
    ...createEmptyContacts(),
    email: email || undefined,
    phone: phone || undefined,
    telegram: telegram || undefined,
    vk: vk || undefined,
  })

  const handleSuggestImprovements = () => {
    const suggested = suggestOpportunitiesFromLead({
      website,
      contacts: buildContacts(),
    })
    setOpportunities((prev) => [...new Set([...prev, ...suggested])])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const data: CreateLeadInput = {
      name,
      niche,
      city,
      source,
      website: website || undefined,
      sourceUrl: sourceUrl || undefined,
      contacts: buildContacts(),
      notes,
      tags,
      opportunities,
    }

    const result = createLeadSchema.safeParse(data)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.errors.forEach((err) => {
        const path = err.path.join('.')
        fieldErrors[path] = err.message
      })
      setErrors(fieldErrors)
      return
    }

    if (onCheckDuplicates && !lead) {
      const duplicates = await onCheckDuplicates(website || undefined, email || undefined)
      if (duplicates.length > 0) {
        setDuplicateWarning(true)
        return
      }
    }

    setIsSubmitting(true)
    try {
      await onSubmit(data)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {lead ? ru.leads.editLead : ru.leads.addLead}
          </SheetTitle>
          <SheetDescription>
            {lead ? 'Обновите информацию о лиде' : 'Заполните данные потенциального клиента'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{ru.leads.formName} *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={ru.leads.formNamePlaceholder}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="niche">{ru.common.niche} *</Label>
              <Input
                id="niche"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
              />
              {errors.niche && <p className="text-xs text-destructive">{errors.niche}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">{ru.common.city}</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{ru.common.source}</Label>
            <Select value={source} onValueChange={(v) => setSource(v as CreateLeadInput['source'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {getSourceLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-4">
            <p className="text-sm font-medium">{ru.leads.formContactsSection}</p>
            <div className="space-y-2">
              <Label htmlFor="source-url">{ru.leads.formSourceUrl}</Label>
              <Input
                id="source-url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder={ru.leads.formSourceUrlPlaceholder}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">{ru.leads.formWebsite}</Label>
              <Input
                id="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder={ru.leads.formWebsitePlaceholder}
              />
              {errors.website && <p className="text-xs text-destructive">{errors.website}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{ru.leads.formEmails}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
              {errors['contacts.email'] && (
                <p className="text-xs text-destructive">{errors['contacts.email']}</p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">{ru.leads.formPhone}</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 ..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telegram">{ru.leads.formTelegram}</Label>
                <Input
                  id="telegram"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  placeholder="https://t.me/... или @username"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vk">{ru.leads.formVk}</Label>
              <Input
                id="vk"
                value={vk}
                onChange={(e) => setVk(e.target.value)}
                placeholder="https://vk.com/..."
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="notes">{ru.leads.formNotes}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={ru.leads.formNotesPlaceholder}
              rows={3}
            />
          </div>

          <ImprovementChecklist value={opportunities} onChange={setOpportunities} />
          <Button type="button" variant="ghost" size="sm" onClick={handleSuggestImprovements}>
            {ru.leads.suggestImprovements}
          </Button>

          <div className="space-y-2">
            <Label>{ru.leads.formTags}</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder={ru.leads.formTagsPlaceholder}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag()
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addTag}>
                {ru.common.add}
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {duplicateWarning && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {ru.leads.duplicateWarning}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
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
