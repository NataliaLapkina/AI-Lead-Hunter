import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export function SettingsOptionGroup<T extends string>({
  label,
  value,
  options,
  labels,
  onChange,
  columns = 2,
}: {
  label: string
  value: T
  options: readonly T[]
  labels: Record<T, string>
  onChange: (value: T) => void
  columns?: 2 | 3 | 4 | 5
}) {
  const gridClass =
    columns === 5
      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
      : columns === 4
        ? 'grid-cols-2 sm:grid-cols-4'
        : columns === 3
          ? 'grid-cols-3'
          : 'grid-cols-2'

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className={cn('grid gap-2', gridClass)}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className={cn(
              'rounded-lg border px-3 py-2 text-sm transition-colors',
              value === option
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-accent hover:text-foreground',
            )}
          >
            {labels[option]}
          </button>
        ))}
      </div>
    </div>
  )
}
