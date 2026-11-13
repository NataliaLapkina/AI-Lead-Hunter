import { describe, expect, it } from 'vitest'
import {
  InvalidKnowledgeRecheckResponseError,
  parseKnowledgeRecheck,
} from './knowledgeRecheck'

const obtainedAt = '2024-02-01T08:30:00.000Z'
const lastCheckedAt = '2024-11-01T12:00:00.000Z'

const outdatedItem = {
  knowledgeId: 'knowledge_1',
  content: 'Сайт больше не открывается',
  type: 'OBSERVATION',
  verificationStatus: 'OUTDATED',
  sourceLabel: 'Сайт компании',
  sourceUrl: 'https://example.test/about',
  obtainedAt,
  lastCheckedAt,
  company: { id: 'company_1', name: 'Северная верфь' },
}

const needsItem = {
  knowledgeId: 'knowledge_2',
  content: 'Телефон нужно подтвердить',
  type: 'USER_INFO',
  verificationStatus: 'NEEDS_VERIFICATION',
  sourceLabel: null,
  sourceUrl: null,
  obtainedAt: null,
  lastCheckedAt: null,
  company: null,
}

describe('parseKnowledgeRecheck', () => {
  it('parses a valid response with both recheck statuses', () => {
    expect(parseKnowledgeRecheck({ items: [outdatedItem, needsItem] })).toEqual({
      items: [outdatedItem, needsItem],
    })
  })

  it('parses OUTDATED and NEEDS_VERIFICATION', () => {
    expect(parseKnowledgeRecheck({ items: [outdatedItem] }).items[0]?.verificationStatus).toBe(
      'OUTDATED',
    )
    expect(parseKnowledgeRecheck({ items: [needsItem] }).items[0]?.verificationStatus).toBe(
      'NEEDS_VERIFICATION',
    )
  })

  it('keeps nullable source and date fields', () => {
    expect(parseKnowledgeRecheck({ items: [needsItem] }).items[0]).toMatchObject({
      sourceLabel: null,
      sourceUrl: null,
      obtainedAt: null,
      lastCheckedAt: null,
      company: null,
    })
  })

  it('rejects an invalid verification status', () => {
    expect(() =>
      parseKnowledgeRecheck({
        items: [{ ...outdatedItem, verificationStatus: 'VERIFIED' }],
      }),
    ).toThrow(InvalidKnowledgeRecheckResponseError)
    expect(() =>
      parseKnowledgeRecheck({
        items: [{ ...outdatedItem, verificationStatus: 'ASSUMPTION' }],
      }),
    ).toThrow(InvalidKnowledgeRecheckResponseError)
  })

  it('rejects an invalid date', () => {
    expect(() =>
      parseKnowledgeRecheck({
        items: [{ ...outdatedItem, lastCheckedAt: '2026-11-10' }],
      }),
    ).toThrow(InvalidKnowledgeRecheckResponseError)
    expect(() =>
      parseKnowledgeRecheck({
        items: [{ ...outdatedItem, obtainedAt: '2026-02-31T00:00:00.000Z' }],
      }),
    ).toThrow(InvalidKnowledgeRecheckResponseError)
  })

  it('rejects an invalid company shape', () => {
    expect(() =>
      parseKnowledgeRecheck({
        items: [{ ...outdatedItem, company: { id: '', name: 'Север' } }],
      }),
    ).toThrow(InvalidKnowledgeRecheckResponseError)
    expect(() =>
      parseKnowledgeRecheck({
        items: [{ ...outdatedItem, company: { name: 'Северная верфь' } }],
      }),
    ).toThrow(InvalidKnowledgeRecheckResponseError)
    expect(() =>
      parseKnowledgeRecheck({
        items: [{ ...outdatedItem, company: 'Северная верфь' }],
      }),
    ).toThrow(InvalidKnowledgeRecheckResponseError)
  })
})
