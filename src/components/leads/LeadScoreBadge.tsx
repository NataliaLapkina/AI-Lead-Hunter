import type { Lead } from '@/domain/lead'
import { computeLeadScore } from '@/lib/leadScore'
import { getLeadPotentialShortLabel } from '@/i18n/ru'
import { cn } from '@/lib/utils'

interface LeadScoreBadgeProps {
  lead: Lead
  className?: string
}

const LEVEL_EMOJI = {
  low: '🔴',
  medium: '🟡',
  high: '🟢',
} as const

export function LeadScoreBadge({ lead, className }: LeadScoreBadgeProps) {
  const { score, level } = computeLeadScore(lead)
  const label = getLeadPotentialShortLabel(level)

  return (
    <span className={cn('inline-flex items-center gap-1 text-sm whitespace-nowrap', className)}>
      <span aria-hidden>{LEVEL_EMOJI[level]}</span>
      <span>
        {label} {score}/10
      </span>
    </span>
  )
}
