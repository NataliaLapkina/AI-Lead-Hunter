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
  BellRing,
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
  variant?: 'default' | 'attention'
  showPulse?: boolean
}

const INTERACTIVE_CARD_CLASS =
  'cursor-pointer transition-all duration-150 hover:scale-[1.02] hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

const ATTENTION_CARD_CLASS =
  'border-red-300 bg-red-50'

const ATTENTION_INTERACTIVE_CLASS =
  'cursor-pointer transition-all duration-150 hover:scale-[1.02] hover:border-red-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2'

function StatCard({
  stat,
  interactive,
}: {
  stat: StatCardConfig
  interactive: boolean
}) {
  const navigate = useNavigate()
  const isClickable = interactive && Boolean(stat.href)
  const isAttention = stat.variant === 'attention'

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
        isAttention && ATTENTION_CARD_CLASS,
        isClickable && (isAttention ? ATTENTION_INTERACTIVE_CLASS : INTERACTIVE_CARD_CLASS),
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {stat.showPulse && (
            <span
              className="relative flex h-2 w-2 shrink-0"
              aria-hidden
            >
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
          )}
          <span>{stat.label}</span>
        </CardTitle>
        <div className={cn('rounded-lg p-2', stat.bg)}>
          <Icon className={cn('h-4 w-4', stat.color)} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className={cn('text-2xl font-bold', isAttention && 'text-red-700')}>
          {stat.value}
        </p>
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
      label: ru.analytics.requiringAttention,
      value: analytics.requiringAttention,
      icon: BellRing,
      color: 'text-red-600',
      bg: 'bg-red-100',
      href: '/leads?attention=overdue',
      variant: 'attention',
      showPulse: analytics.requiringAttention > 0,
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} interactive={interactive} />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {potentialStats.map((stat) => (
          <StatCard key={stat.label} stat={stat} interactive={interactive} />
        ))}
      </div>
    </div>
  )
}
