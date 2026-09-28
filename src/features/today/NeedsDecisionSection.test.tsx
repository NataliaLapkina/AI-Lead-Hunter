/** @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { acceptResultFixture } from '@/domain/decisions/decision.fixture'
import type { NeedsDecisionRecommendation } from '@/domain/recommendations/needsDecision'
import type { CreateTaskFromDecisionResult } from '@/domain/tasks/task'
import { createdTaskFixture } from '@/domain/tasks/task.fixture'
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

const recommendationTwo: NeedsDecisionRecommendation = {
  ...recommendation,
  id: 'rec_2',
  title: 'Написать письмо',
  company: { id: 'company_2', name: 'Beta LLC' },
}

const acceptResultTwo = {
  recommendation: {
    id: 'rec_2',
    status: 'ACCEPTED' as const,
    snoozedUntil: null,
    updatedAt: '2026-09-27T10:00:00.000Z',
  },
  decision: {
    ...acceptResultFixture.decision,
    id: 'dec_2',
    recommendationId: 'rec_2',
    title: 'Решение C2',
  },
}

const session = vi.hoisted(() => ({
  businessId: 'biz_1' as string | null,
}))

const listState = vi.hoisted(() => ({
  current: {
    data: {
      recommendations: [] as NeedsDecisionRecommendation[],
    } as { recommendations: NeedsDecisionRecommendation[] } | null,
    isLoading: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
}))

vi.mock('@/features/business/CurrentBusinessContext', () => ({
  useCurrentBusiness: () => ({ businessId: session.businessId }),
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

vi.mock('@/services/api/createTaskFromDecision', () => ({
  createTaskFromDecision: vi.fn(),
}))

import {
  acceptRecommendation,
  modifyRecommendation,
  rejectRecommendation,
  snoozeRecommendation,
} from '@/services/api/recommendationActions'
import { createTaskFromDecision } from '@/services/api/createTaskFromDecision'

function resetList(
  recommendations: NeedsDecisionRecommendation[],
  extra?: { error?: Error | null; isLoading?: boolean },
) {
  const error = extra?.error ?? null
  const isLoading = extra?.isLoading ?? false
  listState.current = {
    data: error || isLoading ? null : { recommendations },
    isLoading,
    error,
    refetch: listState.current.refetch,
  }
}

async function acceptVisibleRecommendation() {
  fireEvent.click(screen.getByRole('button', { name: ru.today.actions.accept }))
  await waitFor(() => {
    expect(screen.getByText(ru.today.whatNext)).toBeTruthy()
  })
}

function submitCreateTaskTomorrow() {
  fireEvent.click(screen.getByRole('button', { name: ru.today.actions.createTask }))
  fireEvent.click(screen.getByRole('button', { name: ru.today.actions.dueTomorrow }))
  fireEvent.click(screen.getByRole('button', { name: ru.today.actions.createTask }))
}

function submitReminderTomorrow() {
  fireEvent.click(screen.getByRole('button', { name: ru.today.actions.doItMyself }))
  fireEvent.click(screen.getByRole('button', { name: ru.today.actions.dueTomorrow }))
}

async function flushTaskSuccess() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('NeedsDecisionSection action refetch wiring', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    vi.useRealTimers()
    session.businessId = 'biz_1'
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

  it('refetches after Create Task success and does not restore Accept after continuation closes', async () => {
    vi.mocked(acceptRecommendation).mockResolvedValue(acceptResultFixture)
    vi.mocked(createTaskFromDecision).mockResolvedValue({ task: createdTaskFixture })
    const { rerender } = render(<NeedsDecisionSection />)

    await acceptVisibleRecommendation()
    expect(listState.current.refetch).not.toHaveBeenCalled()

    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 27, 10, 0, 0, 0))
    submitCreateTaskTomorrow()
    await flushTaskSuccess()

    expect(screen.getByText(ru.today.taskCreated)).toBeTruthy()
    expect(listState.current.refetch).toHaveBeenCalledTimes(1)
    expect(createTaskFromDecision).toHaveBeenCalledTimes(1)

    resetList([])
    rerender(<NeedsDecisionSection />)
    expect(screen.getByText(ru.today.taskCreated)).toBeTruthy()
    expect(screen.getByRole('button', { name: ru.today.actions.done })).toBeTruthy()
    expect(screen.queryByRole('button', { name: ru.today.actions.accept })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.done }))

    expect(screen.queryByText(ru.today.taskCreated)).toBeNull()
    expect(screen.queryByRole('button', { name: ru.today.actions.accept })).toBeNull()
    expect(screen.getByText(ru.today.emptyNeedsDecision)).toBeTruthy()
    expect(createTaskFromDecision).toHaveBeenCalledTimes(1)
  })

  it('refetches after Reminder tomorrow success and does not restore Accept', async () => {
    vi.mocked(acceptRecommendation).mockResolvedValue(acceptResultFixture)
    vi.mocked(createTaskFromDecision).mockResolvedValue({ task: createdTaskFixture })
    const { rerender } = render(<NeedsDecisionSection />)

    await acceptVisibleRecommendation()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 27, 10, 0, 0, 0))
    submitReminderTomorrow()
    await flushTaskSuccess()

    expect(screen.getByText(ru.today.reminderCreated)).toBeTruthy()
    expect(screen.queryByText(ru.today.taskCreated)).toBeNull()
    expect(listState.current.refetch).toHaveBeenCalledTimes(1)
    expect(createTaskFromDecision).toHaveBeenCalledTimes(1)

    resetList([])
    rerender(<NeedsDecisionSection />)
    expect(screen.getByText(ru.today.reminderCreated)).toBeTruthy()
    expect(screen.getByRole('button', { name: ru.today.actions.done })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.done }))

    expect(screen.queryByRole('button', { name: ru.today.actions.accept })).toBeNull()
    expect(screen.queryByText(ru.today.reminderCreated)).toBeNull()
    expect(screen.getByText(ru.today.emptyNeedsDecision)).toBeTruthy()
    expect(createTaskFromDecision).toHaveBeenCalledTimes(1)
  })

  it('keeps Task success when needs-decision refetch fails and does not POST again', async () => {
    vi.mocked(acceptRecommendation).mockResolvedValue(acceptResultFixture)
    vi.mocked(createTaskFromDecision).mockResolvedValue({ task: createdTaskFixture })
    const { rerender } = render(<NeedsDecisionSection />)

    await acceptVisibleRecommendation()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 27, 10, 0, 0, 0))
    submitCreateTaskTomorrow()
    await flushTaskSuccess()

    expect(screen.getByText(ru.today.taskCreated)).toBeTruthy()
    expect(listState.current.refetch).toHaveBeenCalledTimes(1)

    resetList([], { error: new Error('needs-decision failed') })
    rerender(<NeedsDecisionSection />)
    expect(screen.getByText(ru.today.taskCreated)).toBeTruthy()
    expect(screen.queryByText(ru.today.actionFailed)).toBeNull()
    expect(screen.queryByText(ru.today.actionErrors.decisionStatusConflict)).toBeNull()
    expect(screen.getByRole('button', { name: ru.today.actions.done })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.done }))

    expect(screen.getByText(ru.today.loadError)).toBeTruthy()
    expect(screen.queryByRole('button', { name: ru.today.actions.accept })).toBeNull()
    expect(screen.queryByText(ru.today.taskCreated)).toBeNull()
    expect(createTaskFromDecision).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: ru.today.retry }))
    expect(createTaskFromDecision).toHaveBeenCalledTimes(1)
    expect(listState.current.refetch).toHaveBeenCalledTimes(2)
  })

  it('does not let C1 Done close C2 or restore Accept on C1', async () => {
    listState.current = {
      data: { recommendations: [recommendation, recommendationTwo] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }
    vi.mocked(acceptRecommendation).mockImplementation(async (input) => {
      if (input.recommendationId === 'rec_2') {
        return acceptResultTwo
      }
      return acceptResultFixture
    })
    vi.mocked(createTaskFromDecision).mockResolvedValue({ task: createdTaskFixture })

    const { rerender } = render(<NeedsDecisionSection />)
    fireEvent.click(screen.getAllByRole('button', { name: ru.today.actions.accept })[0] as HTMLElement)
    await waitFor(() => {
      expect(screen.getByText(ru.today.whatNext)).toBeTruthy()
    })

    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 27, 10, 0, 0, 0))
    submitCreateTaskTomorrow()
    await flushTaskSuccess()
    expect(screen.getByText(ru.today.taskCreated)).toBeTruthy()
    expect(listState.current.refetch).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.accept }))
    await flushTaskSuccess()
    expect(screen.getByText('Решение C2')).toBeTruthy()
    expect(screen.getByText(ru.today.whatNext)).toBeTruthy()

    resetList([recommendationTwo])
    rerender(<NeedsDecisionSection />)
    expect(screen.getByText(ru.today.taskCreated)).toBeTruthy()
    expect(screen.getByText('Решение C2')).toBeTruthy()
    expect(screen.getByText(ru.today.whatNext)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.done }))

    expect(screen.queryByText(ru.today.taskCreated)).toBeNull()
    expect(screen.getByText('Решение C2')).toBeTruthy()
    expect(screen.getByText(ru.today.whatNext)).toBeTruthy()
    expect(screen.queryByRole('button', { name: ru.today.actions.accept })).toBeNull()
    expect(createTaskFromDecision).toHaveBeenCalledTimes(1)
  })

  it('does not show Business A continuation after A → B → A', async () => {
    vi.mocked(acceptRecommendation).mockResolvedValue(acceptResultFixture)
    vi.mocked(createTaskFromDecision).mockResolvedValue({ task: createdTaskFixture })
    const { rerender } = render(<NeedsDecisionSection />)

    await acceptVisibleRecommendation()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 27, 10, 0, 0, 0))
    submitCreateTaskTomorrow()
    await flushTaskSuccess()
    expect(screen.getByText(ru.today.taskCreated)).toBeTruthy()
    expect(listState.current.refetch).toHaveBeenCalledTimes(1)

    session.businessId = 'biz_B'
    resetList([recommendationTwo])
    rerender(<NeedsDecisionSection />)
    expect(screen.queryByText(ru.today.taskCreated)).toBeNull()
    expect(screen.getByText('Написать письмо')).toBeTruthy()
    expect(screen.getByRole('button', { name: ru.today.actions.accept })).toBeTruthy()
    expect(screen.queryByText('Acme Studio')).toBeNull()

    session.businessId = 'biz_1'
    resetList([])
    rerender(<NeedsDecisionSection />)
    expect(screen.queryByRole('button', { name: ru.today.actions.accept })).toBeNull()
    expect(screen.getByText(ru.today.emptyNeedsDecision)).toBeTruthy()
    expect(createTaskFromDecision).toHaveBeenCalledTimes(1)
    expect(listState.current.refetch).toHaveBeenCalledTimes(1)
  })

  it('does not let a stale C1 refetch close C2 after Business data is newer', async () => {
    listState.current = {
      data: { recommendations: [recommendation, recommendationTwo] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }
    vi.mocked(acceptRecommendation).mockImplementation(async (input) => {
      if (input.recommendationId === 'rec_2') {
        return acceptResultTwo
      }
      return acceptResultFixture
    })
    vi.mocked(createTaskFromDecision).mockResolvedValue({ task: createdTaskFixture })

    const { rerender } = render(<NeedsDecisionSection />)
    fireEvent.click(screen.getAllByRole('button', { name: ru.today.actions.accept })[0] as HTMLElement)
    await waitFor(() => {
      expect(screen.getByText(ru.today.whatNext)).toBeTruthy()
    })

    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 27, 10, 0, 0, 0))
    submitCreateTaskTomorrow()
    await flushTaskSuccess()

    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.accept }))
    await flushTaskSuccess()
    expect(screen.getByText('Решение C2')).toBeTruthy()

    resetList([])
    rerender(<NeedsDecisionSection />)
    expect(screen.getByText('Решение C2')).toBeTruthy()
    expect(screen.getByText(ru.today.whatNext)).toBeTruthy()
    expect(screen.getByText(ru.today.taskCreated)).toBeTruthy()
    expect(createTaskFromDecision).toHaveBeenCalledTimes(1)
  })

  it('does not POST twice while Create Task is in flight', async () => {
    vi.mocked(acceptRecommendation).mockResolvedValue(acceptResultFixture)
    vi.mocked(createTaskFromDecision).mockImplementation(
      () => new Promise<CreateTaskFromDecisionResult>(() => undefined),
    )
    render(<NeedsDecisionSection />)

    await acceptVisibleRecommendation()
    submitCreateTaskTomorrow()
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.createTask }))
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.createTask }))

    await waitFor(() => {
      expect(createTaskFromDecision).toHaveBeenCalledTimes(1)
    })
    expect(listState.current.refetch).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: ru.today.actions.accept })).toBeNull()
    expect(screen.getByText(ru.today.accepted)).toBeTruthy()
  })
})
