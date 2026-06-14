import { useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { AUTO_SEARCH_SOURCES } from '@/lib/constants'
import { autoSearchFormSchema } from '@/domain/validation'
import { getSourceLabel, ru } from '@/i18n/ru'
import type { AutoSearchParams, AutoSearchSource } from '@/domain/lead'
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

interface AutoSearchFormProps {
  onSearch: (params: AutoSearchParams) => void
  isSearching: boolean
}

export function AutoSearchForm({ onSearch, isSearching }: AutoSearchFormProps) {
  const [niche, setNiche] = useState('')
  const [city, setCity] = useState('')
  const [source, setSource] = useState<AutoSearchSource>('avito')
  const [count, setCount] = useState('5')
  const [linksText, setLinksText] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = autoSearchFormSchema.safeParse({
      niche,
      city,
      source,
      count,
      linksText,
    })

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0]?.toString() ?? 'form'
        fieldErrors[key] = issue.message
      })
      setErrors(fieldErrors)
      return
    }

    setErrors({})
    onSearch(parsed.data)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border bg-card p-4 sm:p-6"
    >
      <p className="text-sm text-muted-foreground">{ru.autoSearch.mockNotice}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="auto-niche">{ru.autoSearch.nicheLabel} *</Label>
          <Input
            id="auto-niche"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder={ru.autoSearch.nichePlaceholder}
          />
          {errors.niche && <p className="text-xs text-destructive">{errors.niche}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="auto-city">{ru.autoSearch.cityLabel}</Label>
          <Input
            id="auto-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={ru.autoSearch.cityPlaceholder}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{ru.autoSearch.sourceLabel}</Label>
          <Select value={source} onValueChange={(v) => setSource(v as AutoSearchSource)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUTO_SEARCH_SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {getSourceLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="auto-count">{ru.autoSearch.countLabel}</Label>
          <Input
            id="auto-count"
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
          {errors.count && <p className="text-xs text-destructive">{errors.count}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="auto-links">{ru.autoSearch.linksLabel}</Label>
        <Textarea
          id="auto-links"
          value={linksText}
          onChange={(e) => setLinksText(e.target.value)}
          placeholder={ru.autoSearch.linksPlaceholder}
          rows={4}
        />
        <p className="text-xs text-muted-foreground">{ru.autoSearch.linksHint}</p>
      </div>

      <Button type="submit" disabled={isSearching} className="gap-2">
        {isSearching ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
        {isSearching ? ru.autoSearch.searching : ru.autoSearch.findLeads}
      </Button>
    </form>
  )
}
