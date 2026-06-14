import { describe, expect, it } from 'vitest'
import {
  mergeLeadFiltersFromSearchParams,
  parseLeadFiltersFromSearchParams,
} from './leadFilters'

describe('parseLeadFiltersFromSearchParams', () => {
  it('parses status and potential params', () => {
    const params = new URLSearchParams('status=in_progress&potential=high')
    expect(parseLeadFiltersFromSearchParams(params)).toEqual({
      status: 'in_progress',
      potential: 'high',
    })
  })

  it('parses client and new status shortcuts', () => {
    expect(parseLeadFiltersFromSearchParams(new URLSearchParams('status=client'))).toEqual({
      status: 'client',
    })
    expect(parseLeadFiltersFromSearchParams(new URLSearchParams('status=new'))).toEqual({
      status: 'new',
    })
  })

  it('ignores unknown params', () => {
    expect(parseLeadFiltersFromSearchParams(new URLSearchParams('status=unknown'))).toEqual({})
  })
})

describe('mergeLeadFiltersFromSearchParams', () => {
  it('merges with defaults', () => {
    const filters = mergeLeadFiltersFromSearchParams(new URLSearchParams('status=new'))
    expect(filters.status).toBe('new')
    expect(filters.potential).toBe('all')
    expect(filters.search).toBe('')
  })
})
