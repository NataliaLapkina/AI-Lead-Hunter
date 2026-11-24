import { describe, expect, it } from 'vitest'
import { BackendApiError } from '@/services/api/apiClient'
import { ru } from '@/i18n/ru'
import {
  InvalidVerifyKnowledgeResponseError,
  getVerifyKnowledgeErrorMessage,
  parseVerifyKnowledgeResult,
} from './verifyKnowledge'

const verified = {
  knowledge: {
    id: 'knowledge_1',
    verificationStatus: 'VERIFIED',
    lastCheckedAt: '2026-11-24T12:00:00.000Z',
    updatedAt: '2026-11-24T12:00:01.000Z',
  },
}

describe('parseVerifyKnowledgeResult', () => {
  it('reads a verified knowledge slice and allows a null lastCheckedAt', () => {
    expect(parseVerifyKnowledgeResult(verified)).toEqual(verified)
    expect(
      parseVerifyKnowledgeResult({
        knowledge: { ...verified.knowledge, lastCheckedAt: null, extra: true },
      }),
    ).toEqual({
      knowledge: { ...verified.knowledge, lastCheckedAt: null },
    })
  })

  it.each(['OUTDATED', 'NEEDS_VERIFICATION', 'ASSUMPTION', 'OPEN'] as const)(
    'rejects verification status %s',
    (verificationStatus) => {
      expect(() =>
        parseVerifyKnowledgeResult({
          knowledge: { ...verified.knowledge, verificationStatus },
        }),
      ).toThrow(InvalidVerifyKnowledgeResponseError)
    },
  )

  it.each([
    '2026-11-24',
    '2026-11-24T12:00:00',
    '2026-02-30T12:00:00.000Z',
    'not-a-date',
  ])('rejects invalid updatedAt %s', (updatedAt) => {
    expect(() =>
      parseVerifyKnowledgeResult({
        knowledge: { ...verified.knowledge, updatedAt },
      }),
    ).toThrow(InvalidVerifyKnowledgeResponseError)
  })

  it('rejects an invalid or missing lastCheckedAt', () => {
    expect(() =>
      parseVerifyKnowledgeResult({
        knowledge: { ...verified.knowledge, lastCheckedAt: '2026-11-24T12:00:00' },
      }),
    ).toThrow(InvalidVerifyKnowledgeResponseError)
    expect(() =>
      parseVerifyKnowledgeResult({
        knowledge: { ...verified.knowledge, lastCheckedAt: undefined },
      }),
    ).toThrow(InvalidVerifyKnowledgeResponseError)
  })

  it('rejects an empty id', () => {
    expect(() =>
      parseVerifyKnowledgeResult({
        knowledge: { ...verified.knowledge, id: '   ' },
      }),
    ).toThrow(InvalidVerifyKnowledgeResponseError)
  })
})

describe('getVerifyKnowledgeErrorMessage', () => {
  it('translates known failures without exposing raw codes', () => {
    expect(
      getVerifyKnowledgeErrorMessage(
        new BackendApiError(404, 'KNOWLEDGE_NOT_FOUND', 'Knowledge not found.', {}),
      ),
    ).toBe(ru.recheck.confirmError.notFound)
    expect(
      getVerifyKnowledgeErrorMessage(
        new BackendApiError(404, 'BUSINESS_NOT_FOUND', 'Business not found.', {}),
      ),
    ).toBe(ru.recheck.confirmError.notFound)
    expect(
      getVerifyKnowledgeErrorMessage(
        new BackendApiError(409, 'KNOWLEDGE_VERIFICATION_CONFLICT', 'raw code', {}),
      ),
    ).toBe(ru.recheck.confirmError.conflict)
    expect(getVerifyKnowledgeErrorMessage(new Error('network down'))).toBe(
      ru.recheck.confirmError.failed,
    )
    expect(getVerifyKnowledgeErrorMessage(new InvalidVerifyKnowledgeResponseError())).toBe(
      ru.recheck.confirmError.failed,
    )
    expect(ru.recheck.confirmError.conflict).not.toContain('KNOWLEDGE_VERIFICATION_CONFLICT')
    expect(ru.recheck.confirmError.notFound).not.toContain('KNOWLEDGE_NOT_FOUND')
  })
})
