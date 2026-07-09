import { nlCn } from './nl-utils'

export function NlProgress({
  value,
  max,
  tone = 'neutral',
}: {
  value: number
  max: number
  tone?: 'neutral' | 'warning' | 'danger'
}) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0

  const barTone =
    tone === 'danger'
      ? 'bg-red-500'
      : tone === 'warning'
        ? 'bg-amber-500'
        : 'bg-[#111827]'

  return (
    <div className="space-y-1.5">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e5e7eb]">
        <div className={nlCn('h-full rounded-full transition-all', barTone)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

export function getUsageTone(value: number, max: number): 'neutral' | 'warning' | 'danger' {
  const ratio = max > 0 ? value / max : 0
  if (ratio >= 0.9) return 'danger'
  if (ratio >= 0.75) return 'warning'
  return 'neutral'
}
