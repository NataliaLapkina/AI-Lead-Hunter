import type { Lead } from '@/domain/lead'
import { computeLeadNextAction, type LeadNextAction } from '@/lib/leadNextAction'

export interface LeadAttentionItem {
  lead: Lead
  action: LeadNextAction
}

export interface ComputeLeadsRequiringAttentionOptions {
  limit?: number
  referenceDate?: Date
}

export function computeLeadsRequiringAttention(
  leads: Lead[],
  options: ComputeLeadsRequiringAttentionOptions = {},
): LeadAttentionItem[] {
  const { limit = 5, referenceDate } = options

  return leads
    .map((lead) => ({
      lead,
      action: computeLeadNextAction(lead, referenceDate),
    }))
    .filter(({ action }) => action.isOverdue)
    .sort((a, b) => b.action.overdueDays - a.action.overdueDays)
    .slice(0, limit)
}

export function countLeadsRequiringAttention(
  leads: Lead[],
  referenceDate?: Date,
): number {
  return filterOverdueLeads(leads, referenceDate).length
}

export function filterOverdueLeads(
  leads: Lead[],
  referenceDate?: Date,
): Lead[] {
  return leads.filter(
    (lead) => computeLeadNextAction(lead, referenceDate).isOverdue,
  )
}

export function sortLeadsByOverdueDays(
  leads: Lead[],
  referenceDate?: Date,
): Lead[] {
  return [...leads].sort(
    (a, b) =>
      computeLeadNextAction(b, referenceDate).overdueDays -
      computeLeadNextAction(a, referenceDate).overdueDays,
  )
}
