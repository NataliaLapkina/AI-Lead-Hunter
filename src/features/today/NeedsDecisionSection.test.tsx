/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NeedsDecisionRecommendation } from '@/domain/recommendations/needsDecision'
import { ru } from '@/i18n/ru'
import { NeedsDecisionSection } from './NeedsDecisionSection'

const recommendation: NeedsDecisionRecommendation = {
  id: 'rec_1',
  title: 'Назначить звонок',
  description: 'Компания ищет подрядчика.',
  reason: 'На сайте открыта вакансия.',
  priority: 'HIGH',
  status: 'NEW',
  snoozedUntil: null,
  createdAt: '2026-09-18T10:00:00.000Z',
  company: { id: 'company_1', name: 'Acme Studio' },
  knowledge: [],
}

const listState = vi.hoisted(() => ({
  current: {
    data: {
      recommendations: [] as NeedsDecisionRecommendation[],
    },
    isLoading: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
}))

vi.mock('@/features/business/CurrentBusinessContext', () => ({
  useCurrentBusiness: () => ({ businessId: 'biz_1' }),
}))

vi.mock('@/features/user/CurrentUserContext', () => ({
  useCurrentUser: () => ({ userId: 'user_1' }),
}))

vi.mock('@/features/today/useNeedsDecisionRecommendations', () => ({
  useNeedsDecisionRecommendations: () => listState.current,
}))

vi.mock('@/services/api/recommendationActions', () => ({
  acceptRecommendation: vi.fn(),
  snoozeRecommendation: vi.fn(),
  modifyRecommendation: vi.fn(),
  rejectRecommendation: vi.fn(),
}))

import { acceptRecommendation } from '@/services/api/recommendationActions'

describe('NeedsDecisionSection action refetch wiring', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    listState.current = {
      data: { recommendations: [recommendation] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }
  })

  it('keeps the card after success until the needs-decision list state updates', async () => {
    listState.current = {
      data: { recommendations: [recommendation] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }
    vi.mocked(acceptRecommendation).mockResolvedValue({})

    const { rerender } = render(<NeedsDecisionSection />)
    expect(screen.getByText('Назначить звонок')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.accept }))

    await waitFor(() => {
      expect(listState.current.refetch).toHaveBeenCalledTimes(1)
    })
    expect(screen.getByText('Назначить звонок')).toBeTruthy()

    listState.current = {
      data: { recommendations: [] },
      isLoading: false,
      error: null,
      refetch: listState.current.refetch,
    }
    rerender(<NeedsDecisionSection />)

    expect(screen.queryByText('Назначить звонок')).toBeNull()
    expect(screen.getByText(ru.today.emptyNeedsDecision)).toBeTruthy()
  })
})
