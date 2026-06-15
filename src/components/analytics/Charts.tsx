import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AnalyticsSummary } from '@/domain/lead'
import type { LeadStatus } from '@/domain/lead'
import { LEAD_STATUSES } from '@/lib/constants'
import { getStatusLabel, ru } from '@/i18n/ru'
import {
  buildLeadsPathForNiche,
  buildLeadsPathForStatus,
} from '@/features/analytics/analyticsNavigation'
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
const BAR_ACTIVE_FILL = '#2563eb'

interface ChartTooltipProps {
  active?: boolean
  payload?: Array<{ name?: string; value?: number }>
}

function OpenLeadsTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null

  const item = payload[0]

  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md">
      <p className="font-medium">
        {item.name}: {item.value}
      </p>
      <p className="text-xs text-muted-foreground">{ru.analytics.openLeadsTooltip}</p>
    </div>
  )
}

interface FunnelBarPayload {
  status: LeadStatus
}

interface StatusFunnelProps {
  analytics: AnalyticsSummary
}

export function StatusFunnel({ analytics }: StatusFunnelProps) {
  const navigate = useNavigate()

  const data = LEAD_STATUSES.map((status) => ({
    name: getStatusLabel(status),
    value: analytics.byStatus[status],
    status,
  })).filter((d) => d.value > 0)

  if (data.length === 0) return null

  const handleBarClick = (payload: FunnelBarPayload) => {
    navigate(buildLeadsPathForStatus(payload.status))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{ru.analytics.funnel}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
            <XAxis type="number" allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis
              type="category"
              dataKey="name"
              width={80}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip content={<OpenLeadsTooltip />} />
            <Bar
              dataKey="value"
              fill="#3b82f6"
              radius={[0, 4, 4, 0]}
              cursor="pointer"
              activeBar={{ fill: BAR_ACTIVE_FILL }}
              onClick={(entry) => {
                const payload = entry?.payload as FunnelBarPayload | undefined
                if (payload?.status) handleBarClick(payload)
              }}
            />
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
  const navigate = useNavigate()
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const data = Object.entries(analytics.byNiche)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  if (data.length === 0) return null

  const handleSliceClick = (index: number) => {
    const niche = data[index]?.name
    if (niche) navigate(buildLeadsPathForNiche(niche))
  }

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
              {data.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={COLORS[index % COLORS.length]}
                  fillOpacity={activeIndex === null || activeIndex === index ? 1 : 0.45}
                  stroke={activeIndex === index ? '#1d4ed8' : undefined}
                  strokeWidth={activeIndex === index ? 2 : 0}
                  cursor="pointer"
                  onClick={() => handleSliceClick(index)}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                />
              ))}
            </Pie>
            <Tooltip content={<OpenLeadsTooltip />} />
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
