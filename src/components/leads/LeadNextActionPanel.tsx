import type { Lead } from '@/domain/lead'
import { computeLeadNextAction, NEXT_ACTION_COLOR_CLASSES } from '@/lib/leadNextAction'
import { ru } from '@/i18n/ru'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatDate } from '@/lib/utils'

interface LeadNextActionPanelProps {
  lead: Lead
}

export function LeadNextActionPanel({ lead }: LeadNextActionPanelProps) {
  const action = computeLeadNextAction(lead)
  const {
    label,
    emoji,
    color,
    recommendedDeadline,
    dueAt,
    isOverdue,
    overdueDays,
  } = action

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{ru.leads.nextActionTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p
          className={cn(
            'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium',
            NEXT_ACTION_COLOR_CLASSES[color],
            isOverdue && 'ring-1 ring-red-300',
          )}
        >
          <span aria-hidden>{emoji}</span>
          <span>{label}</span>
        </p>
        {recommendedDeadline != null && (
          <div className="space-y-1" data-overdue={isOverdue || undefined}>
            <p className="text-sm text-muted-foreground">{ru.leads.nextActionDeadline}</p>
            <p
              className={cn(
                'text-sm font-medium',
                isOverdue && 'text-red-700',
              )}
              aria-live="polite"
            >
              {recommendedDeadline}
            </p>
            {dueAt && (
              <p className="text-xs text-muted-foreground">
                {isOverdue
                  ? `Срок был: ${formatDate(dueAt)} (${overdueDays} ${overdueDays === 1 ? 'день' : overdueDays < 5 ? 'дня' : 'дней'} назад)`
                  : `Крайний срок: ${formatDate(dueAt)}`}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
