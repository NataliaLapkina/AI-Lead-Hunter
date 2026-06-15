import { describe, expect, it } from 'vitest'
import {
  buildLeadsListPath,
  buildLeadsPathForNiche,
  buildLeadsPathForStatus,
  statusToLeadsFilterParam,
} from './analyticsNavigation'

describe('statusToLeadsFilterParam', () => {
  it('maps won to client filter', () => {
    expect(statusToLeadsFilterParam('won')).toBe('client')
  })

  it('keeps other statuses as-is', () => {
    expect(statusToLeadsFilterParam('draft')).toBe('draft')
    expect(statusToLeadsFilterParam('new')).toBe('new')
    expect(statusToLeadsFilterParam('replied')).toBe('replied')
    expect(statusToLeadsFilterParam('contacted')).toBe('contacted')
  })
})

describe('buildLeadsPathForStatus', () => {
  it('builds paths from funnel examples', () => {
    expect(buildLeadsPathForStatus('draft')).toBe('/leads?status=draft')
    expect(buildLeadsPathForStatus('new')).toBe('/leads?status=new')
    expect(buildLeadsPathForStatus('replied')).toBe('/leads?status=replied')
    expect(buildLeadsPathForStatus('won')).toBe('/leads?status=client')
  })
})

describe('buildLeadsPathForNiche', () => {
  it('encodes niche label in query', () => {
    expect(buildLeadsPathForNiche('Нутрициолог')).toBe(
      '/leads?niche=' + encodeURIComponent('Нутрициолог'),
    )
    expect(buildLeadsPathForNiche('Мебельщик')).toBe(
      '/leads?niche=' + encodeURIComponent('Мебельщик'),
    )
  })
})

describe('buildLeadsListPath', () => {
  it('builds in_progress filter path', () => {
    expect(buildLeadsListPath({ status: 'in_progress' })).toBe('/leads?status=in_progress')
  })

  it('returns /leads without query when no filters', () => {
    expect(buildLeadsListPath({})).toBe('/leads')
  })
})
