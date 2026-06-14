import type { AnalyticsSummary } from '@/domain/lead'
import { ru } from '@/i18n/ru'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users,
  UserPlus,
  MessageSquare,
  Trophy,
  TrendingUp,
  Sparkles,
  Minus,
  AlertCircle,
} from 'lucide-react'

interface StatsCardsProps {
  analytics: AnalyticsSummary
}

export function StatsCards({ analytics }: StatsCardsProps) {
  const inProgress =
    analytics.byStatus.contacted +
    analytics.byStatus.replied +
    analytics.byStatus.meeting

  const stats = [
    {
      label: ru.dashboard.totalLeads,
      value: analytics.totalLeads,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: ru.dashboard.newLeads,
      value: analytics.byStatus.new,
      icon: UserPlus,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      label: ru.dashboard.contacted,
      value: inProgress,
      icon: MessageSquare,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: ru.dashboard.won,
      value: analytics.byStatus.won,
      icon: Trophy,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: ru.dashboard.conversion,
      value: `${analytics.conversionRate}%`,
      icon: TrendingUp,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
  ]

  const potentialStats = [
    {
      label: ru.analytics.potentialHigh,
      value: analytics.byPotential.high,
      icon: Sparkles,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: ru.analytics.potentialMedium,
      value: analytics.byPotential.medium,
      icon: Minus,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: ru.analytics.potentialLow,
      value: analytics.byPotential.low,
      icon: AlertCircle,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <div className={`rounded-lg p-2 ${bg}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {potentialStats.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <div className={`rounded-lg p-2 ${bg}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
