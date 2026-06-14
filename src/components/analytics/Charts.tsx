import type { AnalyticsSummary } from '@/domain/lead'
import { LEAD_STATUSES } from '@/lib/constants'
import { getStatusLabel, ru } from '@/i18n/ru'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#6b7280', '#94a3b8']

interface StatusFunnelProps {
  analytics: AnalyticsSummary
}

export function StatusFunnel({ analytics }: StatusFunnelProps) {
  const data = LEAD_STATUSES.map((status) => ({
    name: getStatusLabel(status),
    value: analytics.byStatus[status],
    status,
  })).filter((d) => d.value > 0)

  if (data.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{ru.analytics.funnel}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

interface NicheDistributionProps {
  analytics: AnalyticsSummary
}

export function NicheDistribution({ analytics }: NicheDistributionProps) {
  const data = Object.entries(analytics.byNiche)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  if (data.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{ru.analytics.byNiche}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              label={({ name, value }) => `${name}: ${value}`}
              labelLine={false}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

interface ActivityTimelineProps {
  analytics: AnalyticsSummary
}

export function ActivityTimeline({ analytics }: ActivityTimelineProps) {
  const activities = analytics.recentActivity.slice(0, 10)

  if (activities.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{ru.analytics.activity}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
            >
              <span className="text-sm">
                {ru.activity[activity.type as keyof typeof ru.activity] ?? activity.type}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(activity.timestamp).toLocaleString('ru-RU', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
