import type { LeadStatus, LeadStatusFilter } from '@/domain/lead'
import type { LeadFilters } from '@/domain/lead'
import { buildLeadSearchParams } from '@/features/leads/leadFilters'

/** Параметр фильтра /leads для столбца воронки статусов. */
export function statusToLeadsFilterParam(status: LeadStatus): LeadStatusFilter {
  if (status === 'won') return 'client'
  return status
}

export function buildLeadsListPath(filters: Partial<LeadFilters>): string {
  const params = buildLeadSearchParams({
    search: '',
    status: 'all',
    niche: '',
    source: 'all',
    potential: 'all',
    tags: [],
    attention: 'all',
    ...filters,
  })

  const query = params.toString()
  return query ? `/leads?${query}` : '/leads'
}

export function buildLeadsPathForStatus(status: LeadStatus): string {
  return buildLeadsListPath({ status: statusToLeadsFilterParam(status) })
}

export function buildLeadsPathForNiche(nicheLabel: string): string {
  return buildLeadsListPath({ niche: nicheLabel.trim() })
}
