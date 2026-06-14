import { useNavigate } from 'react-router-dom'
import type { Lead } from '@/domain/lead'
import { ru, getNicheLabel } from '@/i18n/ru'
import { formatDate, cn } from '@/lib/utils'
import { computeActionRequiredCounts } from '@/lib/leadNextAction'
import { LeadStatusBadge } from '@/components/leads/LeadStatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, UserPlus, ArrowRight } from 'lucide-react'

interface ActionRequiredProps {
  leads: Lead[]
}

export function ActionRequired({ leads }: ActionRequiredProps) {
  const navigate = useNavigate()
  const counts = computeActionRequiredCounts(leads)

  const items = [
    {
      label: ru.dashboard.actionRequiredNew,
      count: counts.new,
      href: '/leads?status=new',
    },
    {
      label: ru.dashboard.actionRequiredNoReply,
      count: counts.noReply,
      href: '/leads?status=no_reply',
    },
    {
      label: ru.dashboard.actionRequiredInProgress,
      count: counts.inProgress,
      href: '/leads?status=in_progress',
    },
  ]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">{ru.dashboard.actionRequired}</CardTitle>
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-semibold text-primary">
          {counts.total}
        </span>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map(({ label, count, href }) => (
          <button
            key={href}
            type="button"
            onClick={() => navigate(href)}
            className={cn(
              'flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-all',
              'cursor-pointer hover:border-primary/40 hover:bg-muted/50 hover:shadow-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            )}
          >
            <span className="font-medium">{label}</span>
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="text-base font-semibold text-foreground">{count}</span>
              <ArrowRight className="h-4 w-4" aria-hidden />
            </span>
          </button>
        ))}
      </CardContent>
    </Card>
  )
}

interface QuickActionsProps {
  onAddLead: () => void
}

export function QuickActions({ onAddLead }: QuickActionsProps) {
  const navigate = useNavigate()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{ru.dashboard.quickActions}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button onClick={() => navigate('/search')} variant="outline" className="gap-2">
          <Search className="h-4 w-4" />
          {ru.dashboard.newSearch}
        </Button>
        <Button onClick={onAddLead} className="gap-2">
          <UserPlus className="h-4 w-4" />
          {ru.dashboard.addLead}
        </Button>
      </CardContent>
    </Card>
  )
}

interface RecentLeadsProps {
  leads: Lead[]
  onLeadClick: (id: string) => void
}

export function RecentLeads({ leads, onLeadClick }: RecentLeadsProps) {
  const navigate = useNavigate()
  const recent = leads.slice(0, 5)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{ru.dashboard.recentLeads}</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/leads')} className="gap-1">
          {ru.dashboard.viewAll}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет лидов</p>
        ) : (
          <div className="space-y-3">
            {recent.map((lead) => (
              <button
                key={lead.id}
                type="button"
                onClick={() => onLeadClick(lead.id)}
                className="flex w-full items-center justify-between rounded-lg p-2 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <div>
                  <p className="text-sm font-medium">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {getNicheLabel(lead.niche)} · {formatDate(lead.createdAt)}
                  </p>
                </div>
                <LeadStatusBadge status={lead.status} />
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
