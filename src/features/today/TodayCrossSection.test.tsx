/** @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { acceptResultFixture } from '@/domain/decisions/decision.fixture'
import type { NeedsDecisionRecommendation } from '@/domain/recommendations/needsDecision'
import type { TodayDeferredItem } from '@/domain/recommendations/todayDeferred'
import type { TodayAttentionItem } from '@/domain/tasks/todayAttention'
import type { CompleteTaskResult } from '@/domain/tasks/completeTask'
import type { TodayTask } from '@/domain/tasks/todayTask'
import { createdTaskFixture } from '@/domain/tasks/task.fixture'
import { ru } from '@/i18n/ru'
import { TodayView } from './TodayView'

const phase = vi.hoisted(() => ({
  recommendations: [] as NeedsDecisionRecommendation[],
  deferred: [] as TodayDeferredItem[],
  tasks: [] as TodayTask[],
  attention: [] as TodayAttentionItem[],
}))

vi.mock('@/features/business/CurrentBusinessContext', () => ({
  useCurrentBusiness: () => ({ businessId: 'biz_1' }),
}))

vi.mock('@/features/user/CurrentUserContext', () => ({
  useCurrentUser: () => ({ userId: 'user_1' }),
}))

vi.mock('@/services/api/listNeedsDecisionRecommendations', () => ({
  listNeedsDecisionRecommendations: vi.fn(async () => ({
    recommendations: phase.recommendations,
  })),
}))

vi.mock('@/services/api/listTodayDeferred', () => ({
  listTodayDeferred: vi.fn(async () => ({ items: phase.deferred })),
}))

vi.mock('@/services/api/listTodayTasks', () => ({
  listTodayTasks: vi.fn(async () => ({ tasks: phase.tasks })),
}))

vi.mock('@/services/api/listTodayAttention', () => ({
  listTodayAttention: vi.fn(async () => ({ items: phase.attention })),
}))

vi.mock('@/services/api/recommendationActions', () => ({
  acceptRecommendation: vi.fn(),
  snoozeRecommendation: vi.fn(),
  modifyRecommendation: vi.fn(),
  rejectRecommendation: vi.fn(),
}))

vi.mock('@/services/api/completeTask', () => ({
  completeTask: vi.fn(),
}))

vi.mock('@/services/api/createTaskFromDecision', () => ({
  createTaskFromDecision: vi.fn(),
}))

import { listNeedsDecisionRecommendations } from '@/services/api/listNeedsDecisionRecommendations'
import { listTodayAttention } from '@/services/api/listTodayAttention'
import { listTodayDeferred } from '@/services/api/listTodayDeferred'
import { listTodayTasks } from '@/services/api/listTodayTasks'
import { acceptRecommendation, snoozeRecommendation } from '@/services/api/recommendationActions'
import { completeTask } from '@/services/api/completeTask'
import { createTaskFromDecision } from '@/services/api/createTaskFromDecision'

const recommendation: NeedsDecisionRecommendation = {
  id: 'rec_1',
  title: 'Назначить звонок',
  description: 'Компания ждёт ответ.',
  reason: '',
  priority: 'HIGH',
  status: 'NEW',
  snoozedUntil: null,
  createdAt: '2026-11-08T08:00:00.000Z',
  company: { id: 'company_1', name: 'Acme Studio' },
  knowledge: [],
}

const deferredItem: TodayDeferredItem = {
  id: 'rec_1',
  title: 'Назначить звонок',
  status: 'VIEWED',
  snoozedUntil: '2026-11-10T11:30:00.000Z',
  company: { id: 'company_1', name: 'Acme Studio' },
}

const openTask: TodayTask = {
  id: 'task_1',
  title: 'Позвонить клиенту',
  status: 'TODO',
  dueAt: '2026-11-08T09:00:00.000Z',
  priority: 'MEDIUM',
  isOverdue: false,
  company: { id: 'company_1', name: 'Северная верфь' },
  decision: { id: 'decision_1', title: 'Связаться сегодня', status: 'ACTIVE' },
}

const attentionItem: TodayAttentionItem = {
  id: 'task_1',
  completedAt: '2026-11-08T12:00:00.000Z',
  completionOutcome: 'FOLLOW_UP',
  title: 'Позвонить клиенту',
  company: { id: 'company_1', name: 'Северная верфь' },
  decision: { id: 'decision_1', title: 'Связаться сегодня', status: 'ACTIVE' },
}

const createdTodayTask: TodayTask = {
  id: 'task_new',
  title: acceptResultFixture.decision.title,
  status: 'TODO',
  dueAt: '2026-11-08T12:00:00.000Z',
  priority: 'MEDIUM',
  isOverdue: false,
  company: { id: 'company_1', name: 'Acme Studio' },
  decision: {
    id: acceptResultFixture.decision.id,
    title: acceptResultFixture.decision.title,
    status: 'ACTIVE',
  },
}

function deferred<T>() {
  let resolvePromise: (value: T) => void = () => {}
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve
  })
  return { promise, resolve: resolvePromise }
}

function completedTask(outcome: CompleteTaskResult['task']['completionOutcome']): CompleteTaskResult {
  return {
    task: {
      id: openTask.id,
      status: 'DONE',
      completedAt: '2026-11-08T12:00:00.000Z',
      completionOutcome: outcome,
      completionComment: null,
    },
  }
}

function sectionByHeading(name: string): HTMLElement {
  const heading = screen.getByRole('heading', { name })
  const section = heading.closest('section')
  if (!section) {
    throw new Error(`Section for ${name} was not found.`)
  }
  return section
}

describe('Today cross-section refetch', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    vi.useRealTimers()
    phase.recommendations = []
    phase.deferred = []
    phase.tasks = []
    phase.attention = []
  })

  it('moves a snoozed recommendation into Отложено after both lists refetch', async () => {
    phase.recommendations = [recommendation]
    const pending = deferred<Record<string, never>>()
    vi.mocked(snoozeRecommendation).mockReturnValue(pending.promise)

    render(<TodayView />)
    await waitFor(() => {
      expect(within(sectionByHeading(ru.today.needsDecision)).getByText(recommendation.title)).toBeTruthy()
    })
    expect(within(sectionByHeading(ru.today.deferred)).getByText(ru.today.emptyDeferred)).toBeTruthy()
    expect(listNeedsDecisionRecommendations).toHaveBeenCalledTimes(1)
    expect(listTodayDeferred).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.snooze }))
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.tomorrow }))
    await waitFor(() => {
      expect(snoozeRecommendation).toHaveBeenCalledTimes(1)
    })
    expect(within(sectionByHeading(ru.today.deferred)).getByText(ru.today.emptyDeferred)).toBeTruthy()
    expect(within(sectionByHeading(ru.today.needsDecision)).getByText(recommendation.title)).toBeTruthy()

    phase.recommendations = []
    phase.deferred = [deferredItem]
    await act(async () => {
      pending.resolve({})
      await pending.promise
    })

    await waitFor(() => {
      expect(within(sectionByHeading(ru.today.needsDecision)).getByText(ru.today.emptyNeedsDecision)).toBeTruthy()
    })
    expect(within(sectionByHeading(ru.today.deferred)).getByRole('heading', { name: 'Acme Studio' })).toBeTruthy()
    expect(within(sectionByHeading(ru.today.deferred)).getByText(recommendation.title)).toBeTruthy()
    expect(within(sectionByHeading(ru.today.needsDecision)).queryByText(recommendation.title)).toBeNull()
    expect(screen.getAllByText(recommendation.title)).toHaveLength(1)
    expect(listNeedsDecisionRecommendations).toHaveBeenCalledTimes(2)
    expect(listTodayDeferred).toHaveBeenCalledTimes(2)
  })

  it('shows attention only after a successful follow-up completion', async () => {
    phase.tasks = [openTask]
    const pending = deferred<CompleteTaskResult>()
    vi.mocked(completeTask).mockReturnValue(pending.promise)

    render(<TodayView />)
    await waitFor(() => {
      expect(within(sectionByHeading(ru.today.needsToDo)).getByRole('heading', { name: openTask.title })).toBeTruthy()
    })
    expect(within(sectionByHeading(ru.today.needsAttention)).getByText(ru.today.emptyNeedsAttention)).toBeTruthy()
    const tasksSection = sectionByHeading(ru.today.needsToDo)
    const attentionSection = sectionByHeading(ru.today.needsAttention)

    fireEvent.click(screen.getByRole('button', { name: ru.today.taskActions.complete }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: ru.today.complete.outcomes.FOLLOW_UP }))
    fireEvent.click(within(dialog).getByRole('button', { name: ru.today.taskActions.complete }))
    await waitFor(() => {
      expect(completeTask).toHaveBeenCalledTimes(1)
    })
    expect(within(tasksSection).getByRole('heading', { name: openTask.title, hidden: true })).toBeTruthy()
    expect(within(attentionSection).getByText(ru.today.emptyNeedsAttention)).toBeTruthy()
    expect(listTodayAttention).toHaveBeenCalledTimes(1)

    phase.tasks = []
    phase.attention = [attentionItem]
    await act(async () => {
      pending.resolve(completedTask('FOLLOW_UP'))
      await pending.promise
    })

    await waitFor(() => {
      expect(within(sectionByHeading(ru.today.needsToDo)).queryByRole('heading', { name: openTask.title })).toBeNull()
    })
    expect(within(sectionByHeading(ru.today.needsAttention)).getByRole('heading', { name: 'Северная верфь' })).toBeTruthy()
    expect(within(sectionByHeading(ru.today.needsAttention)).getByText(openTask.title)).toBeTruthy()
    expect(listTodayTasks).toHaveBeenCalledTimes(2)
    expect(listTodayAttention).toHaveBeenCalledTimes(2)
  })

  it('does not show attention after a contacted completion', async () => {
    phase.tasks = [openTask]
    vi.mocked(completeTask).mockImplementation(async () => {
      phase.tasks = []
      phase.attention = []
      return completedTask('CONTACTED')
    })

    render(<TodayView />)
    await waitFor(() => {
      expect(within(sectionByHeading(ru.today.needsToDo)).getByRole('heading', { name: openTask.title })).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: ru.today.taskActions.complete }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: ru.today.complete.outcomes.CONTACTED }))
    fireEvent.click(within(dialog).getByRole('button', { name: ru.today.taskActions.complete }))

    await waitFor(() => {
      expect(within(sectionByHeading(ru.today.needsToDo)).getByText(ru.today.emptyNeedsToDo)).toBeTruthy()
    })
    expect(within(sectionByHeading(ru.today.needsAttention)).getByText(ru.today.emptyNeedsAttention)).toBeTruthy()
    expect(listTodayAttention).toHaveBeenCalledTimes(2)
  })

  it('shows a task created from an accepted recommendation when its refetch is due today', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 8, 10, 0, 0))
    phase.recommendations = [recommendation]
    vi.mocked(acceptRecommendation).mockResolvedValue(acceptResultFixture)
    const pending = deferred<{ task: typeof createdTaskFixture }>()
    vi.mocked(createTaskFromDecision).mockReturnValue(pending.promise)

    render(<TodayView />)
    await waitFor(() => {
      expect(within(sectionByHeading(ru.today.needsDecision)).getByText(recommendation.title)).toBeTruthy()
    })
    expect(listTodayTasks).toHaveBeenCalledTimes(1)
    expect(within(sectionByHeading(ru.today.needsToDo)).getByText(ru.today.emptyNeedsToDo)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.accept }))
    await waitFor(() => {
      expect(screen.getByText(ru.today.whatNext)).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.createTask }))
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.dueToday }))
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.createTask }))
    await waitFor(() => {
      expect(createTaskFromDecision).toHaveBeenCalledTimes(1)
    })
    expect(within(sectionByHeading(ru.today.needsToDo)).queryByRole('heading', { name: createdTodayTask.title })).toBeNull()

    phase.recommendations = []
    phase.tasks = [createdTodayTask]
    await act(async () => {
      pending.resolve({ task: createdTaskFixture })
      await pending.promise
    })

    await waitFor(() => {
      expect(
        within(sectionByHeading(ru.today.needsToDo)).getByRole('heading', { name: createdTodayTask.title }),
      ).toBeTruthy()
    })
    expect(listNeedsDecisionRecommendations).toHaveBeenCalledTimes(2)
    expect(listTodayTasks).toHaveBeenCalledTimes(2)
  })

  it('does not show a post-accept task whose refetch is outside today', async () => {
    phase.recommendations = [recommendation]
    vi.mocked(acceptRecommendation).mockResolvedValue(acceptResultFixture)
    vi.mocked(createTaskFromDecision).mockImplementation(async () => {
      phase.recommendations = []
      phase.tasks = []
      return { task: createdTaskFixture }
    })

    render(<TodayView />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: ru.today.actions.accept })).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.accept }))
    await waitFor(() => {
      expect(screen.getByText(ru.today.whatNext)).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.createTask }))
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.dueTomorrow }))
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.createTask }))

    await waitFor(() => {
      expect(listTodayTasks).toHaveBeenCalledTimes(2)
    })
    expect(within(sectionByHeading(ru.today.needsToDo)).getByText(ru.today.emptyNeedsToDo)).toBeTruthy()
    expect(within(sectionByHeading(ru.today.needsToDo)).queryByRole('heading', { name: createdTodayTask.title })).toBeNull()
  })
})
