import type {
  Lead,
  LeadStatus,
  LeadSource,
  AnalyticsSummary,
  LeadActivity,
} from '@/domain/lead'
import { LEAD_STATUSES, LEAD_SOURCES } from '@/lib/constants'
import { formatNicheDisplay, nicheDisplayKey } from '@/lib/nicheDisplay'
import { computeLeadScore } from '@/lib/leadScore'
import { countLeadsRequiringAttention } from '@/lib/leadAttention'

export function computeAnalytics(leads: Lead[]): AnalyticsSummary {
  const byStatus = Object.fromEntries(
    LEAD_STATUSES.map((s) => [s, 0]),
  ) as Record<LeadStatus, number>

  const byNiche: Record<string, number> = {}
  const bySource = Object.fromEntries(
    LEAD_SOURCES.map((s) => [s, 0]),
  ) as Record<LeadSource, number>
  const byPotential = { low: 0, medium: 0, high: 0 }

  const allActivity: LeadActivity[] = []

  for (const lead of leads) {
    byStatus[lead.status]++
    const nicheLabel = formatNicheDisplay(lead.niche)
    byNiche[nicheLabel] = (byNiche[nicheLabel] ?? 0) + 1
    bySource[lead.source]++
    byPotential[computeLeadScore(lead).level]++
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
    byPotential,
    requiringAttention: countLeadsRequiringAttention(leads),
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
  const byKey = new Map<string, string>()
  for (const lead of leads) {
    const key = nicheDisplayKey(lead.niche)
    if (!key) continue
    if (!byKey.has(key)) {
      byKey.set(key, formatNicheDisplay(lead.niche))
    }
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, 'ru'))
}

export function getUniqueTags(leads: Lead[]): string[] {
  const tags = new Set<string>()
  leads.forEach((l) => l.tags.forEach((t) => tags.add(t)))
  return [...tags].sort((a, b) => a.localeCompare(b, 'ru'))
}
