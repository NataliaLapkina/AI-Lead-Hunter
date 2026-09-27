/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { acceptResultFixture } from '@/domain/decisions/decision.fixture'
import type { NeedsDecisionRecommendation } from '@/domain/recommendations/needsDecision'
import { BackendApiError } from '@/services/api/apiClient'
import { ru } from '@/i18n/ru'
import { NeedsDecisionCard } from './NeedsDecisionCard'

vi.mock('@/features/business/CurrentBusinessContext', () => ({
  useCurrentBusiness: () => ({ businessId: 'biz_1' }),
}))

vi.mock('@/features/user/CurrentUserContext', () => ({
  useCurrentUser: () => ({ userId: 'user_1' }),
}))

vi.mock('@/services/api/recommendationActions', () => ({
  acceptRecommendation: vi.fn(),
  snoozeRecommendation: vi.fn(),
  modifyRecommendation: vi.fn(),
  rejectRecommendation: vi.fn(),
}))

import { acceptRecommendation } from '@/services/api/recommendationActions'

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
  knowledge: [
    {
      id: 'knowledge_1',
      content: 'На сайте указан телефон офиса.',
      type: 'FACT',
      verificationStatus: 'VERIFIED',
      sourceType: 'WEBSITE',
      sourceLabel: 'Официальный сайт',
      sourceUrl: 'https://example.com',
      obtainedAt: '2026-09-18T10:00:00.000Z',
      lastCheckedAt: null,
    },
  ],
}

function renderCard(
  onActionSuccess = vi.fn(),
  onAccepted = vi.fn(),
  continuation: Parameters<typeof NeedsDecisionCard>[0]['continuation'] = null,
) {
  render(
    <NeedsDecisionCard
      recommendation={recommendation}
      continuation={continuation}
      onAccepted={onAccepted}
      onActionSuccess={onActionSuccess}
    />,
  )
  return { onActionSuccess, onAccepted }
}

describe('NeedsDecisionCard', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  beforeEach(() => {
    vi.mocked(acceptRecommendation).mockReset()
  })

  it('renders company, title, description, priority, Why-AI and Knowledge', () => {
    renderCard()

    expect(screen.getByText('Acme Studio')).toBeTruthy()
    expect(screen.getByText('Назначить звонок')).toBeTruthy()
    expect(screen.getByText('Компания ищет подрядчика.')).toBeTruthy()
    expect(screen.getByText(ru.today.priority.HIGH)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: ru.today.whyAiDecided }))

    expect(screen.getByText('На сайте открыта вакансия.')).toBeTruthy()
    expect(screen.getByText('На сайте указан телефон офиса.')).toBeTruthy()
    expect(screen.getByText(ru.today.knowledgeType.FACT)).toBeTruthy()
    expect(screen.getByText(ru.today.verification.VERIFIED)).toBeTruthy()
    expect(screen.getByText('Официальный сайт')).toBeTruthy()
  })

  it('opens mutually exclusive action panels', () => {
    renderCard()

    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.snooze }))
    expect(screen.getByRole('button', { name: ru.today.actions.tomorrow })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.modify }))
    expect(screen.getByLabelText(ru.today.actions.decisionTitle)).toBeTruthy()
    expect(screen.queryByRole('button', { name: ru.today.actions.tomorrow })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.reject }))
    expect(screen.getByLabelText(ru.today.rejectionReasons.NOT_RELEVANT)).toBeTruthy()
    expect(screen.queryByLabelText(ru.today.actions.decisionTitle)).toBeNull()
  })

  it('exposes Modify and OTHER comment fields by accessible name', () => {
    renderCard()

    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.modify }))
    expect(screen.getByLabelText(ru.today.actions.decisionTitle)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.reject }))
    fireEvent.click(screen.getByLabelText(ru.today.rejectionReasons.OTHER))
    expect(screen.getByLabelText(ru.today.actions.rejectionComment)).toBeTruthy()
  })

  it('disables action controls while a request is in flight', async () => {
    vi.mocked(acceptRecommendation).mockImplementation(
      () => new Promise(() => undefined),
    )
    renderCard()

    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.accept }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: ru.today.actions.accept })).toHaveProperty(
        'disabled',
        true,
      )
    })
    expect(screen.getByRole('button', { name: ru.today.actions.snooze })).toHaveProperty(
      'disabled',
      true,
    )
    expect(screen.getByRole('button', { name: ru.today.actions.modify })).toHaveProperty(
      'disabled',
      true,
    )
    expect(screen.getByRole('button', { name: ru.today.actions.reject })).toHaveProperty(
      'disabled',
      true,
    )
  })

  it('shows an action error without removing the card or calling refetch', async () => {
    vi.mocked(acceptRecommendation).mockRejectedValue(
      new BackendApiError(409, 'RECOMMENDATION_STATUS_CONFLICT', 'raw', {}),
    )
    const { onActionSuccess, onAccepted } = renderCard()

    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.accept }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe(
        ru.today.actionErrors.statusConflict,
      )
    })
    expect(screen.getByText('Назначить звонок')).toBeTruthy()
    expect(screen.getByText('Acme Studio')).toBeTruthy()
    expect(onActionSuccess).not.toHaveBeenCalled()
    expect(onAccepted).not.toHaveBeenCalled()
  })

  it('clears a stale action error on cancel and panel switch', async () => {
    vi.mocked(acceptRecommendation).mockRejectedValue(
      new BackendApiError(409, 'RECOMMENDATION_STATUS_CONFLICT', 'raw', {}),
    )
    renderCard()

    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.accept }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.modify }))
    expect(screen.queryByRole('alert')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.continue }))
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe(ru.today.invalidDecisionTitle)
    })

    fireEvent.click(screen.getByRole('button', { name: ru.common.cancel }))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('keeps Accept Decision without refetching the list', async () => {
    vi.mocked(acceptRecommendation).mockResolvedValue(acceptResultFixture)
    const { onActionSuccess, onAccepted } = renderCard()

    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.accept }))

    await waitFor(() => {
      expect(onAccepted).toHaveBeenCalledWith({
        businessId: 'biz_1',
        recommendationId: 'rec_1',
        decision: acceptResultFixture.decision,
      })
    })
    expect(onActionSuccess).not.toHaveBeenCalled()
    expect(screen.getByText('Назначить звонок')).toBeTruthy()
  })

  it('renders Post-Accept from Decision.title and hides the old four actions', () => {
    renderCard(vi.fn(), vi.fn(), {
      identity: 1,
      recommendationId: 'rec_1',
      businessId: 'biz_1',
      decision: acceptResultFixture.decision,
      recommendation,
    })

    expect(screen.getByText(ru.today.accepted)).toBeTruthy()
    expect(screen.getByText(acceptResultFixture.decision.title)).toBeTruthy()
    expect(screen.getByRole('button', { name: ru.today.actions.createTask })).toBeTruthy()
    expect(screen.getByRole('button', { name: ru.today.actions.doItMyself })).toBeTruthy()
    expect(screen.queryByRole('button', { name: ru.today.actions.accept })).toBeNull()
    expect(screen.queryByRole('button', { name: ru.today.actions.snooze })).toBeNull()
    expect(screen.queryByRole('button', { name: ru.today.actions.modify })).toBeNull()
    expect(screen.queryByRole('button', { name: ru.today.actions.reject })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Подготовить с AI' })).toBeNull()
  })
})
