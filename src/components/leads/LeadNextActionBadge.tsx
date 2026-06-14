import type { Lead } from '@/domain/lead'
import {
  computeLeadNextAction,
  NEXT_ACTION_COLOR_CLASSES,
} from '@/lib/leadNextAction'
import { cn } from '@/lib/utils'

interface LeadNextActionBadgeProps {
  lead: Lead
  variant?: 'short' | 'full'
  className?: string
}

export function LeadNextActionBadge({
  lead,
  variant = 'short',
  className,
}: LeadNextActionBadgeProps) {
  const action = computeLeadNextAction(lead)
  const label = variant === 'short' ? action.shortLabel : action.label

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        NEXT_ACTION_COLOR_CLASSES[action.color],
        className,
      )}
    >
      <span aria-hidden>{action.emoji}</span>
      <span>{label}</span>
    </span>
  )
}
