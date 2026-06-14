import type { NichePreset } from '@/domain/lead'
import { ru, getNicheLabel } from '@/i18n/ru'
import { cn } from '@/lib/utils'

interface NicheSuggestionsProps {
  presets: NichePreset[]
  selectedPresetId: string | null
  onSelect: (preset: NichePreset) => void
}

export function NicheSuggestions({
  presets,
  selectedPresetId,
  onSelect,
}: NicheSuggestionsProps) {
  if (presets.length === 0) return null

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">{ru.search.suggestions}</p>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => {
          const isActive = selectedPresetId === preset.id

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelect(preset)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary'
                  : 'border-border bg-background text-foreground hover:border-primary/60 hover:bg-primary/5',
              )}
              aria-pressed={isActive}
            >
              {getNicheLabel(preset.name)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
