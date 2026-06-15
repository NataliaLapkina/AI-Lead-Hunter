import type { LeadFilters, LeadPotentialFilter, LeadStatus } from '@/domain/lead'
import { LEAD_STATUSES } from '@/lib/constants'

export const DEFAULT_LEAD_FILTERS: LeadFilters = {
  search: '',
  status: 'all',
  niche: '',
  source: 'all',
  potential: 'all',
  tags: [],
  attention: 'all',
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

  if (params.get('attention') === 'overdue') {
    result.attention = 'overdue'
  }

  return result
}

export function buildLeadSearchParams(filters: LeadFilters): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.status !== 'all') {
    params.set('status', filters.status)
  }

  if (filters.potential !== 'all') {
    params.set('potential', filters.potential)
  }

  if (filters.attention === 'overdue') {
    params.set('attention', 'overdue')
  }

  return params
}

export function mergeLeadFiltersFromSearchParams(
  params: URLSearchParams,
): LeadFilters {
  return {
    ...DEFAULT_LEAD_FILTERS,
    ...parseLeadFiltersFromSearchParams(params),
  }
}
