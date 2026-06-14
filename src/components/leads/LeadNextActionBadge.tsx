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
  interactive?: boolean
  onActivate?: (lead: Lead) => void
}

export function LeadNextActionBadge({
  lead,
  variant = 'short',
  className,
  interactive = false,
  onActivate,
}: LeadNextActionBadgeProps) {
  const action = computeLeadNextAction(lead)
  const label = variant === 'short' ? action.shortLabel : action.label

  const content = (
    <>
      <span aria-hidden>{action.emoji}</span>
      <span>{label}</span>
    </>
  )

  const styles = cn(
    'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
    NEXT_ACTION_COLOR_CLASSES[action.color],
    interactive &&
      'cursor-pointer transition-all hover:shadow-sm hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
    className,
  )

  if (!interactive || !onActivate) {
    return <span className={styles}>{content}</span>
  }

  return (
    <button
      type="button"
      title={action.tooltip}
      aria-label={`${label}: ${action.tooltip}`}
      className={styles}
      onClick={(event) => {
        event.stopPropagation()
        onActivate(lead)
      }}
    >
      {content}
    </button>
  )
}
