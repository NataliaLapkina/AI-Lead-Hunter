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
  const {
    shortLabel,
    label,
    emoji,
    color,
    tooltip,
    recommendedDeadline,
    isOverdue,
    overdueDays,
    dueAt,
  } = action

  const actionLabel = variant === 'short' ? shortLabel : label
  const deadlineLabel = recommendedDeadline

  const content = (
    <>
      <span aria-hidden>{emoji}</span>
      <span>{actionLabel}</span>
      {deadlineLabel != null && (
        <span
          className={cn(
            'font-normal opacity-90',
            isOverdue && 'font-semibold',
          )}
        >
          · {deadlineLabel}
        </span>
      )}
    </>
  )

  const ariaLabel = [
    actionLabel,
    tooltip,
    isOverdue && overdueDays > 0 ? `просрочено на ${overdueDays} дней` : null,
    dueAt && !isOverdue ? `срок ${deadlineLabel}` : null,
  ]
    .filter(Boolean)
    .join(', ')

  const styles = cn(
    'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
    NEXT_ACTION_COLOR_CLASSES[color],
    isOverdue && 'ring-1 ring-red-300',
    interactive &&
      'cursor-pointer transition-all hover:shadow-sm hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
    className,
  )

  if (!interactive || !onActivate) {
    return (
      <span className={styles} title={tooltip} aria-label={ariaLabel}>
        {content}
      </span>
    )
  }

  return (
    <button
      type="button"
      title={tooltip}
      aria-label={ariaLabel}
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
