/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { acceptResultFixture } from '@/domain/decisions/decision.fixture'
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

import {
  acceptRecommendation,
  modifyRecommendation,
  rejectRecommendation,
  snoozeRecommendation,
} from '@/services/api/recommendationActions'

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

  it('keeps Post-Accept after Accept even if the list no longer contains the recommendation', async () => {
    listState.current = {
      data: { recommendations: [recommendation] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }
    vi.mocked(acceptRecommendation).mockResolvedValue(acceptResultFixture)

    const { rerender } = render(<NeedsDecisionSection />)
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.accept }))

    await waitFor(() => {
      expect(screen.getByText(ru.today.accepted)).toBeTruthy()
    })
    expect(screen.getByText(acceptResultFixture.decision.title)).toBeTruthy()
    expect(listState.current.refetch).not.toHaveBeenCalled()

    listState.current = {
      data: { recommendations: [] },
      isLoading: false,
      error: null,
      refetch: listState.current.refetch,
    }
    rerender(<NeedsDecisionSection />)

    expect(screen.getByText(ru.today.accepted)).toBeTruthy()
    expect(screen.getByText(acceptResultFixture.decision.title)).toBeTruthy()
    expect(screen.queryByText(ru.today.emptyNeedsDecision)).toBeNull()
  })

  it('still refetches after Snooze, Modify and Reject', async () => {
    listState.current = {
      data: { recommendations: [recommendation] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }
    vi.mocked(snoozeRecommendation).mockResolvedValue({})
    vi.mocked(modifyRecommendation).mockResolvedValue({})
    vi.mocked(rejectRecommendation).mockResolvedValue({})

    const { unmount } = render(<NeedsDecisionSection />)
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.snooze }))
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.tomorrow }))
    await waitFor(() => {
      expect(listState.current.refetch).toHaveBeenCalledTimes(1)
    })
    unmount()

    listState.current.refetch = vi.fn()
    render(<NeedsDecisionSection />)
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.modify }))
    fireEvent.change(screen.getByLabelText(ru.today.actions.decisionTitle), {
      target: { value: 'Позвонить' },
    })
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.continue }))
    await waitFor(() => {
      expect(listState.current.refetch).toHaveBeenCalledTimes(1)
    })
    cleanup()

    listState.current = {
      data: { recommendations: [recommendation] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }
    render(<NeedsDecisionSection />)
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.reject }))
    const rejectButtons = screen.getAllByRole('button', {
      name: ru.today.actions.reject,
    })
    fireEvent.click(rejectButtons[rejectButtons.length - 1] as HTMLElement)
    await waitFor(() => {
      expect(listState.current.refetch).toHaveBeenCalledTimes(1)
    })
  })
})
