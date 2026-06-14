import type { LeadFilters, LeadPotentialFilter, LeadStatus } from '@/domain/lead'
import { LEAD_STATUSES } from '@/lib/constants'

export const DEFAULT_LEAD_FILTERS: LeadFilters = {
  search: '',
  status: 'all',
  niche: '',
  source: 'all',
  potential: 'all',
  tags: [],
}

export const IN_PROGRESS_STATUSES: LeadStatus[] = ['contacted', 'replied', 'meeting']

const POTENTIAL_PARAMS: LeadPotentialFilter[] = ['high', 'medium', 'low']

export function parseLeadFiltersFromSearchParams(
  params: URLSearchParams,
): Partial<LeadFilters> {
  const result: Partial<LeadFilters> = {}

  const status = params.get('status')
  if (status === 'in_progress' || status === 'client') {
    result.status = status
  } else if (status && LEAD_STATUSES.includes(status as LeadStatus)) {
    result.status = status as LeadStatus
  }

  const potential = params.get('potential')
  if (potential && POTENTIAL_PARAMS.includes(potential as LeadPotentialFilter)) {
    result.potential = potential as LeadPotentialFilter
  }

  return result
}

export function mergeLeadFiltersFromSearchParams(
  params: URLSearchParams,
): LeadFilters {
  return {
    ...DEFAULT_LEAD_FILTERS,
    ...parseLeadFiltersFromSearchParams(params),
  }
}
