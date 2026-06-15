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
  return leads.filter(
    (lead) => computeLeadNextAction(lead, referenceDate).isOverdue,
  ).length
}
