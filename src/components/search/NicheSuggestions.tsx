import type { NichePreset } from '@/domain/lead'
import { ru, getNicheLabel } from '@/i18n/ru'
import { Badge } from '@/components/ui/badge'

interface NicheSuggestionsProps {
  presets: NichePreset[]
  onSelect: (name: string) => void
}

export function NicheSuggestions({ presets, onSelect }: NicheSuggestionsProps) {
  if (presets.length === 0) return null

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">{ru.search.suggestions}</p>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelect(preset.name)}
            className="group"
          >
            <Badge
              variant="outline"
              className="cursor-pointer px-3 py-1.5 transition-colors hover:border-primary hover:bg-primary/5"
            >
              {getNicheLabel(preset.name)}
            </Badge>
          </button>
        ))}
      </div>
    </div>
  )
}
