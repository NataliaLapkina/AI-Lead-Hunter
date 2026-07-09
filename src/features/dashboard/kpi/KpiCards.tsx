import { NlBadge, NlCard, NlProgress, getUsageTone } from '@/components/nl'
import { isUsageWarning, type DashboardKpiState } from '@/features/dashboard/dashboardMvpMock'

interface KpiMetricCardProps {
  title: string
  value: string
  tone: 'neutral' | 'warning'
  showProgress?: boolean
  progressValue?: number
  progressMax?: number
}

function KpiMetricCard({
  title,
  value,
  tone,
  showProgress,
  progressValue,
  progressMax,
}: KpiMetricCardProps) {
  const progressTone =
    showProgress && progressValue !== undefined && progressMax !== undefined
      ? getUsageTone(progressValue, progressMax)
      : 'neutral'

  return (
    <NlCard tone={tone} className="flex h-full min-h-[132px] flex-col">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280]">{title}</p>
        {tone === 'warning' && <NlBadge variant="warning">Warning</NlBadge>}
      </div>
      <p className="mt-2 text-2xl font-semibold text-[#111827]">{value}</p>
      {showProgress && progressValue !== undefined && progressMax !== undefined ? (
        <div className="mt-auto pt-3">
          <NlProgress value={progressValue} max={progressMax} tone={progressTone} />
        </div>
      ) : (
        <div className="mt-auto" />
      )}
    </NlCard>
  )
}

interface KpiCardsProps {
  kpi: DashboardKpiState
}

export function KpiCards({ kpi }: KpiCardsProps) {
  const leadsWarning = isUsageWarning(kpi.leadsUsed, kpi.leadsLimit)
  const emailsWarning = isUsageWarning(kpi.aiEmailsUsed, kpi.aiEmailsLimit)

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiMetricCard
        title="Leads"
        value={`${kpi.leadsUsed} / ${kpi.leadsLimit}`}
        tone={leadsWarning ? 'warning' : 'neutral'}
        showProgress
        progressValue={kpi.leadsUsed}
        progressMax={kpi.leadsLimit}
      />
      <KpiMetricCard
        title="AI Emails"
        value={`${kpi.aiEmailsUsed} / ${kpi.aiEmailsLimit}`}
        tone={emailsWarning ? 'warning' : 'neutral'}
        showProgress
        progressValue={kpi.aiEmailsUsed}
        progressMax={kpi.aiEmailsLimit}
      />
      <KpiMetricCard title="Export" value="Blocked" tone="neutral" />
      <KpiMetricCard title="Plan" value={kpi.plan} tone="neutral" />
    </section>
  )
}
