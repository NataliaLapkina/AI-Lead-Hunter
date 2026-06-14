import type { ImprovementOpportunity } from '@/domain/lead'
import { getOpportunityLabel } from '@/features/leads/improvements'
import { cn } from '@/lib/utils'
import { ru } from '@/i18n/ru'

interface ImprovementChecklistProps {
  value: ImprovementOpportunity[]
  onChange: (value: ImprovementOpportunity[]) => void
  className?: string
}

const OPPORTUNITY_KEYS: ImprovementOpportunity[] = [
  'no_website',
  'no_booking_form',
  'no_whatsapp',
  'outdated_design',
  'no_online_booking',
]

export function ImprovementChecklist({ value, onChange, className }: ImprovementChecklistProps) {
  const toggle = (key: ImprovementOpportunity) => {
    if (value.includes(key)) {
      onChange(value.filter((k) => k !== key))
    } else {
      onChange([...value, key])
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-sm font-medium">{ru.leads.improvementsTitle}</p>
      <p className="text-xs text-muted-foreground">{ru.leads.improvementsHint}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {OPPORTUNITY_KEYS.map((key) => {
          const checked = value.includes(key)
          return (
            <label
              key={key}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors',
                checked
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-border hover:border-primary/20 hover:bg-muted/30',
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(key)}
                className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
              />
              <span>{getOpportunityLabel(key)}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

export function ImprovementBadges({
  opportunities,
}: {
  opportunities: ImprovementOpportunity[]
}) {
  if (opportunities.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {opportunities.map((key) => (
        <span
          key={key}
          className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900"
        >
          {getOpportunityLabel(key)}
        </span>
      ))}
    </div>
  )
}
