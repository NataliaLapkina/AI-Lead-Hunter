import { Monitor, Moon, Sun } from 'lucide-react'
import type { ThemeMode } from '@/lib/theme'
import { useTheme } from '@/features/theme/ThemeProvider'
import { ru } from '@/i18n/ru'
import { cn } from '@/lib/utils'

const OPTIONS: Array<{
  value: ThemeMode
  label: string
  icon: typeof Sun
}> = [
  { value: 'light', label: ru.settings.themeLight, icon: Sun },
  { value: 'dark', label: ru.settings.themeDark, icon: Moon },
  { value: 'system', label: ru.settings.themeSystem, icon: Monitor },
]

interface ThemeModeSelectProps {
  variant?: 'segmented' | 'compact'
  className?: string
}

export function ThemeModeSelect({ variant = 'segmented', className }: ThemeModeSelectProps) {
  const { mode, setMode } = useTheme()

  if (variant === 'compact') {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <p className="px-3 text-xs font-medium text-muted-foreground">{ru.settings.theme}</p>
        <div className="flex gap-1 px-2">
          {OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                'flex flex-1 items-center justify-center rounded-lg p-2 transition-colors',
                mode === value
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('grid grid-cols-3 gap-2', className)}>
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={mode === value}
          onClick={() => setMode(value)}
          className={cn(
            'flex flex-col items-center gap-2 rounded-lg border px-3 py-3 text-sm transition-colors',
            mode === value
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-accent hover:text-foreground',
          )}
        >
          <Icon className="h-5 w-5" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}
