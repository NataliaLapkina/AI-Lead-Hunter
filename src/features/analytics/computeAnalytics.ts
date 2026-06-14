import type {
  Lead,
  LeadStatus,
  LeadSource,
  AnalyticsSummary,
  LeadActivity,
} from '@/domain/lead'
import { LEAD_STATUSES, LEAD_SOURCES } from '@/lib/constants'

export function computeAnalytics(leads: Lead[]): AnalyticsSummary {
  const byStatus = Object.fromEntries(
    LEAD_STATUSES.map((s) => [s, 0]),
  ) as Record<LeadStatus, number>

  const byNiche: Record<string, number> = {}
  const bySource = Object.fromEntries(
    LEAD_SOURCES.map((s) => [s, 0]),
  ) as Record<LeadSource, number>

  const allActivity: LeadActivity[] = []

  for (const lead of leads) {
    byStatus[lead.status]++
    byNiche[lead.niche] = (byNiche[lead.niche] ?? 0) + 1
    bySource[lead.source]++
    allActivity.push(...lead.activityLog)
  }

  allActivity.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )

  const total = leads.length
  const conversionRate = total > 0 ? Math.round((byStatus.won / total) * 100) : 0

  return {
    totalLeads: total,
    byStatus,
    byNiche,
    bySource,
    conversionRate,
    recentActivity: allActivity.slice(0, 20),
  }
}

export function getActiveLeadsCount(leads: Lead[]): number {
  return leads.filter(
    (l) => !['won', 'lost', 'archived'].includes(l.status),
  ).length
}

export function getUniqueNiches(leads: Lead[]): string[] {
  return [...new Set(leads.map((l) => l.niche))].sort((a, b) =>
    a.localeCompare(b, 'ru'),
  )
}

export function getUniqueTags(leads: Lead[]): string[] {
  const tags = new Set<string>()
  leads.forEach((l) => l.tags.forEach((t) => tags.add(t)))
  return [...tags].sort((a, b) => a.localeCompare(b, 'ru'))
}
