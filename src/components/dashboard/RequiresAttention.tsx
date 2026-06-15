import type { Lead } from '@/domain/lead'
import { computeLeadsRequiringAttention, countLeadsRequiringAttention } from '@/lib/leadAttention'
import { LeadScoreBadge } from '@/components/leads/LeadScoreBadge'
import { ru } from '@/i18n/ru'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface RequiresAttentionProps {
  leads: Lead[]
  onLeadClick: (lead: Lead) => void
}

export function RequiresAttention({ leads, onLeadClick }: RequiresAttentionProps) {
  const navigate = useNavigate()
  const items = computeLeadsRequiringAttention(leads)
  const totalOverdue = countLeadsRequiringAttention(leads)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">{ru.dashboard.requiresAttention}</CardTitle>
          {totalOverdue > 0 && (
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-sm font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
              {totalOverdue}
            </span>
          )}
        </div>
        {totalOverdue > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/leads?attention=overdue')}
            className="gap-1"
          >
            {ru.dashboard.viewOverdue}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{ru.dashboard.requiresAttentionEmpty}</p>
        ) : (
          <div className="space-y-2">
            {items.map(({ lead, action }) => (
              <button
                key={lead.id}
                type="button"
                onClick={() => onLeadClick(lead)}
                className={cn(
                  'flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-all',
                  'cursor-pointer hover:border-red-200 hover:bg-red-50/50 hover:shadow-sm dark:hover:border-red-800 dark:hover:bg-red-950/30',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                )}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium">{lead.name}</p>
                  <p className="text-muted-foreground">
                    <span aria-hidden>{action.emoji}</span>{' '}
                    {action.shortLabel}
                  </p>
                  {action.recommendedDeadline && (
                    <p className="font-medium text-red-700 dark:text-red-300">{action.recommendedDeadline}</p>
                  )}
                </div>
                <LeadScoreBadge lead={lead} className="shrink-0" />
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

