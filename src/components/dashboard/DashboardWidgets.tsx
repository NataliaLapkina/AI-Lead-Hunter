import { useNavigate } from 'react-router-dom'
import type { Lead } from '@/domain/lead'
import { ru } from '@/i18n/ru'
import { formatDate } from '@/lib/utils'
import { LeadStatusBadge } from '@/components/leads/LeadStatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, UserPlus, ArrowRight } from 'lucide-react'

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
                className="flex w-full items-center justify-between rounded-lg p-2 text-left transition-colors hover:bg-muted/50"
              >
                <div>
                  <p className="text-sm font-medium">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {lead.niche} · {formatDate(lead.createdAt)}
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
