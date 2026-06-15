import { describe, expect, it } from 'vitest'
import {
  buildLeadSearchParams,
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

  it('parses niche from URL', () => {
    expect(
      parseLeadFiltersFromSearchParams(
        new URLSearchParams(`niche=${encodeURIComponent('Нутрициолог')}`),
      ),
    ).toEqual({ niche: 'Нутрициолог' })
  })

  it('parses attention=overdue', () => {
    expect(parseLeadFiltersFromSearchParams(new URLSearchParams('attention=overdue'))).toEqual({
      attention: 'overdue',
    })
  })
})

describe('mergeLeadFiltersFromSearchParams', () => {
  it('merges with defaults', () => {
    const filters = mergeLeadFiltersFromSearchParams(new URLSearchParams('status=new'))
    expect(filters.status).toBe('new')
    expect(filters.potential).toBe('all')
    expect(filters.attention).toBe('all')
    expect(filters.search).toBe('')
  })

  it('merges attention=overdue from URL', () => {
    const filters = mergeLeadFiltersFromSearchParams(new URLSearchParams('attention=overdue'))
    expect(filters.attention).toBe('overdue')
  })
})

describe('buildLeadSearchParams', () => {
  it('builds attention and status params', () => {
    const params = buildLeadSearchParams({
      search: '',
      status: 'new',
      niche: '',
      source: 'all',
      potential: 'all',
      tags: [],
      attention: 'overdue',
    })

    expect(params.toString()).toBe('status=new&attention=overdue')
  })

  it('builds niche param', () => {
    const params = buildLeadSearchParams({
      search: '',
      status: 'all',
      niche: 'Мебельщик',
      source: 'all',
      potential: 'all',
      tags: [],
      attention: 'all',
    })

    expect(params.get('niche')).toBe('Мебельщик')
  })
})
