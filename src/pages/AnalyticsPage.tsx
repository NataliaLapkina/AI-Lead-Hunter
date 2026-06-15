import { useEffect, useState } from 'react'
import { BarChart3, Loader2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { StatsCards } from '@/components/analytics/StatsCards'
import { StatusFunnel, NicheDistribution, ActivityTimeline } from '@/components/analytics/Charts'
import { EmptyState } from '@/components/shared/EmptyState'
import { useAnalytics } from '@/features/analytics/hooks/useAnalytics'
import { useLeadStore } from '@/stores'
import { ru } from '@/i18n/ru'

export function AnalyticsPage() {
  const analytics = useAnalytics()
  const { leads, isLoading, fetchLeads } = useLeadStore()
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  useEffect(() => {
    if (!isLoading) setHasLoaded(true)
  }, [isLoading])

  const isEmpty = leads.length === 0

  return (
    <AppShell title={ru.analytics.title} subtitle={ru.analytics.subtitle}>
      {!hasLoaded || isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>{ru.common.loading}</span>
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={<BarChart3 className="h-10 w-10" />}
          title={ru.analytics.emptyTitle}
          description={ru.analytics.emptyDescription}
        />
      ) : (
        <div className="space-y-6">
          <StatsCards analytics={analytics} interactive />
          <div className="grid gap-6 lg:grid-cols-2">
            <StatusFunnel analytics={analytics} />
            <NicheDistribution analytics={analytics} />
          </div>
          <ActivityTimeline analytics={analytics} />
        </div>
      )}
    </AppShell>
  )
}
