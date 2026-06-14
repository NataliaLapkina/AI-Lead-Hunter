import type { Lead } from '@/domain/lead'
import { computeLeadNextAction, NEXT_ACTION_COLOR_CLASSES } from '@/lib/leadNextAction'
import { ru } from '@/i18n/ru'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface LeadNextActionPanelProps {
  lead: Lead
}

export function LeadNextActionPanel({ lead }: LeadNextActionPanelProps) {
  const action = computeLeadNextAction(lead)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{ru.leads.nextActionTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p
          className={cn(
            'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium',
            NEXT_ACTION_COLOR_CLASSES[action.color],
          )}
        >
          <span aria-hidden>{action.emoji}</span>
          <span>{action.label}</span>
        </p>
        {action.recommendedDeadline && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{ru.leads.nextActionDeadline}</p>
            <p className="text-sm font-medium">{action.recommendedDeadline}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
