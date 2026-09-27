export const acceptedDecisionFixture = {
  id: 'dec_1',
  recommendationId: 'rec_1',
  companyId: 'company_1',
  title: 'Позвонить сегодня',
  description: null,
  status: 'ACTIVE',
  decidedById: 'user_1',
  createdAt: '2026-09-27T10:00:00.000Z',
  updatedAt: '2026-09-27T10:00:00.000Z',
} as const

export const acceptResultFixture = {
  recommendation: {
    id: 'rec_1',
    status: 'ACCEPTED',
    snoozedUntil: null,
    updatedAt: '2026-09-27T10:00:00.000Z',
  },
  decision: acceptedDecisionFixture,
} as const
