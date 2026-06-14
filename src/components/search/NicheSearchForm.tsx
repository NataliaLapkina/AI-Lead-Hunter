import { useState } from 'react'
import { LEAD_SOURCES } from '@/lib/constants'
import { getSourceLabel, ru } from '@/i18n/ru'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'

interface NicheSearchFormProps {
  onGenerate: (data: { niche: string; city: string; source?: string }) => void
  isGenerating: boolean
}

export function NicheSearchForm({ onGenerate, isGenerating }: NicheSearchFormProps) {
  const [niche, setNiche] = useState('')
  const [city, setCity] = useState('')
  const [source, setSource] = useState<string>('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!niche.trim()) return
    onGenerate({
      niche: niche.trim(),
      city: city.trim(),
      source: source || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-card p-6">
      <div className="space-y-2">
        <Label htmlFor="search-niche">{ru.search.nicheLabel} *</Label>
        <Input
          id="search-niche"
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          placeholder={ru.search.nichePlaceholder}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="search-city">{ru.search.cityLabel}</Label>
          <Input
            id="search-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={ru.search.cityPlaceholder}
          />
        </div>
        <div className="space-y-2">
          <Label>{ru.search.sourceLabel}</Label>
          <Select value={source || 'none'} onValueChange={(v) => setSource(v === 'none' ? '' : v)}>
            <SelectTrigger>
              <SelectValue placeholder={ru.common.all} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{ru.common.all}</SelectItem>
              {LEAD_SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {getSourceLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="submit" disabled={!niche.trim() || isGenerating} className="gap-2">
        <Search className="h-4 w-4" />
        {ru.search.generate}
      </Button>
    </form>
  )
}
