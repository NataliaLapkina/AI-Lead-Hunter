import { useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import type { AnalyticsSummary } from '@/domain/lead'
import { ru } from '@/i18n/ru'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  Users,
  UserPlus,
  MessageSquare,
  Trophy,
  TrendingUp,
  Sparkles,
  Minus,
  AlertCircle,
  ArrowRight,
} from 'lucide-react'

interface StatsCardsProps {
  analytics: AnalyticsSummary
  interactive?: boolean
}

interface StatCardConfig {
  label: string
  value: number | string
  icon: LucideIcon
  color: string
  bg: string
  href?: string
}

function StatCard({
  stat,
  interactive,
}: {
  stat: StatCardConfig
  interactive: boolean
}) {
  const navigate = useNavigate()
  const isClickable = interactive && Boolean(stat.href)

  const handleActivate = () => {
    if (stat.href) navigate(stat.href)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isClickable) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleActivate()
    }
  }

  const Icon = stat.icon

  return (
    <Card
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? handleActivate : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      className={cn(
        isClickable &&
          'cursor-pointer transition-all hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {stat.label}
        </CardTitle>
        <div className={`rounded-lg p-2 ${stat.bg}`}>
          <Icon className={`h-4 w-4 ${stat.color}`} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-2xl font-bold">{stat.value}</p>
        {isClickable && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            {ru.dashboard.viewList}
            <ArrowRight className="h-3 w-3" aria-hidden />
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function StatsCards({ analytics, interactive = false }: StatsCardsProps) {
  const inProgress =
    analytics.byStatus.contacted +
    analytics.byStatus.replied +
    analytics.byStatus.meeting

  const stats: StatCardConfig[] = [
    {
      label: ru.dashboard.totalLeads,
      value: analytics.totalLeads,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      href: '/leads',
    },
    {
      label: ru.dashboard.newLeads,
      value: analytics.byStatus.new,
      icon: UserPlus,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      href: '/leads?status=new',
    },
    {
      label: ru.dashboard.contacted,
      value: inProgress,
      icon: MessageSquare,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      href: '/leads?status=in_progress',
    },
    {
      label: ru.dashboard.won,
      value: analytics.byStatus.won,
      icon: Trophy,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      href: '/leads?status=client',
    },
    {
      label: ru.dashboard.conversion,
      value: `${analytics.conversionRate}%`,
      icon: TrendingUp,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
  ]

  const potentialStats: StatCardConfig[] = [
    {
      label: ru.analytics.potentialHigh,
      value: analytics.byPotential.high,
      icon: Sparkles,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      href: '/leads?potential=high',
    },
    {
      label: ru.analytics.potentialMedium,
      value: analytics.byPotential.medium,
      icon: Minus,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      href: '/leads?potential=medium',
    },
    {
      label: ru.analytics.potentialLow,
      value: analytics.byPotential.low,
      icon: AlertCircle,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      href: '/leads?potential=low',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} interactive={interactive} />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {potentialStats.map((stat) => (
          <StatCard key={stat.label} stat={stat} interactive={interactive} />
        ))}
      </div>
    </div>
  )
}
