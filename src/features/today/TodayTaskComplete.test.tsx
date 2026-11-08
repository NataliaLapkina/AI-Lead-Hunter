/** @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TodayTask } from '@/domain/tasks/todayTask'
import { ru } from '@/i18n/ru'
import { BackendApiError } from '@/services/api/apiClient'
import { TodayTasksSection } from './TodayTasksSection'

const dueAt = '2026-10-11T09:30:00.000Z'
const completedAt = '2026-11-08T12:00:00.000Z'

function makeTask(overrides: Partial<TodayTask> & Pick<TodayTask, 'id' | 'title' | 'status'>): TodayTask {
  return {
    dueAt,
    priority: 'HIGH',
    isOverdue: false,
    company: { id: 'company_1', name: 'Северная верфь' },
    decision: { id: 'decision_1', title: 'Связаться сегодня', status: 'ACTIVE' },
    ...overrides,
  }
}

const todoTask = makeTask({
  id: 'task_todo',
  title: 'Позвонить клиенту',
  status: 'TODO',
})

const progressTask = makeTask({
  id: 'task_progress',
  title: 'Уже в работе',
  status: 'IN_PROGRESS',
})

const otherTask = makeTask({
  id: 'task_other',
  title: 'Подготовить письмо',
  status: 'TODO',
})

const session = vi.hoisted(() => ({
  businessId: 'biz_1' as string | null,
}))

const refetch = vi.hoisted(() => vi.fn())

const listState = vi.hoisted(() => ({
  current: {
    data: { tasks: [] as TodayTask[] },
    isLoading: false,
    error: null as Error | null,
    refetch,
  },
}))

vi.mock('@/features/business/CurrentBusinessContext', () => ({
  useCurrentBusiness: () => ({ businessId: session.businessId }),
}))

vi.mock('@/features/today/useTodayTasks', () => ({
  useTodayTasks: () => listState.current,
}))

vi.mock('@/services/api/startTask', () => ({
  startTask: vi.fn(),
}))

vi.mock('@/services/api/rescheduleTask', () => ({
  rescheduleTask: vi.fn(),
}))

vi.mock('@/services/api/completeTask', () => ({
  completeTask: vi.fn(),
}))

import { completeTask } from '@/services/api/completeTask'
import { rescheduleTask } from '@/services/api/rescheduleTask'
import { startTask } from '@/services/api/startTask'

type CompleteResult = {
  task: {
    id: string
    status: 'DONE'
    completedAt: string
    completionOutcome: 'CONTACTED' | 'NO_RESPONSE' | 'FOLLOW_UP' | 'DECLINED' | 'OTHER'
    completionComment: string | null
  }
}

function deferred<T>() {
  let resolvePromise: (value: T) => void = () => {}
  let rejectPromise: (error: unknown) => void = () => {}
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve
    rejectPromise = reject
  })

  return { promise, resolve: resolvePromise, reject: rejectPromise }
}

function show(tasks: TodayTask[]) {
  listState.current = {
    data: { tasks },
    isLoading: false,
    error: null,
    refetch,
  }
}

function card(title: string): HTMLElement {
  const heading = screen.getByRole('heading', { name: title, hidden: true })
  const root = heading.closest('.rounded-xl')
  if (!root) {
    throw new Error(`Card for ${title} was not found.`)
  }

  return root as HTMLElement
}

function dialog(): HTMLElement {
  return screen.getByRole('dialog')
}

function openComplete(title: string) {
  fireEvent.click(
    within(card(title)).getByRole('button', { name: ru.today.taskActions.complete, hidden: true }),
  )
}

function submitButton(): HTMLButtonElement {
  return within(dialog()).getByRole('button', {
    name: ru.today.taskActions.complete,
  }) as HTMLButtonElement
}

function choose(outcome: keyof typeof ru.today.complete.outcomes) {
  fireEvent.click(within(dialog()).getByRole('button', { name: ru.today.complete.outcomes[outcome] }))
}

describe('Today task complete', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    session.businessId = 'biz_1'
    refetch.mockReset()
    vi.mocked(startTask).mockReset()
    vi.mocked(rescheduleTask).mockReset()
    vi.mocked(completeTask).mockReset()
    show([])
  })

  it('opens from a TODO task and an in-progress task, and closes on cancel', () => {
    show([todoTask, progressTask])
    render(<TodayTasksSection />)

    expect(
      (within(card(todoTask.title)).getByRole('button', { name: ru.today.taskActions.start }) as HTMLButtonElement)
        .disabled,
    ).toBe(false)
    expect(
      (within(card(progressTask.title)).getByRole('button', { name: ru.today.taskActions.start }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)

    for (const task of [todoTask, progressTask]) {
      const root = card(task.title)
      expect(
        (within(root).getByRole('button', { name: ru.today.taskActions.reschedule }) as HTMLButtonElement).disabled,
      ).toBe(false)
      expect(
        (within(root).getByRole('button', { name: ru.today.taskActions.complete }) as HTMLButtonElement).disabled,
      ).toBe(false)
      expect(within(root).queryByText(ru.today.taskActions.unavailable)).toBeNull()
    }

    openComplete(todoTask.title)
    expect(within(dialog()).getByRole('heading', { name: ru.today.complete.title })).toBeTruthy()
    expect(within(dialog()).getByText(ru.today.complete.question)).toBeTruthy()
    expect(within(dialog()).getByText(todoTask.title)).toBeTruthy()
    expect(submitButton().disabled).toBe(true)
    fireEvent.click(within(dialog()).getByRole('button', { name: ru.common.cancel }))
    expect(screen.queryByRole('dialog')).toBeNull()

    openComplete(progressTask.title)
    expect(within(dialog()).getByText(progressTask.title)).toBeTruthy()
    fireEvent.click(within(dialog()).getByRole('button', { name: ru.common.cancel }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(completeTask).not.toHaveBeenCalled()
    expect(startTask).not.toHaveBeenCalled()
    expect(rescheduleTask).not.toHaveBeenCalled()
  })

  it('shows every outcome and requires a comment only for the other result', () => {
    show([todoTask])
    render(<TodayTasksSection />)
    openComplete(todoTask.title)

    for (const outcome of ['CONTACTED', 'NO_RESPONSE', 'FOLLOW_UP', 'DECLINED', 'OTHER'] as const) {
      expect(
        within(dialog()).getByRole('button', { name: ru.today.complete.outcomes[outcome] }),
      ).toBeTruthy()
    }

    for (const outcome of ['CONTACTED', 'NO_RESPONSE', 'FOLLOW_UP', 'DECLINED'] as const) {
      choose(outcome)
      expect(
        within(dialog()).getByRole('button', { name: ru.today.complete.outcomes[outcome] }).getAttribute('aria-pressed'),
      ).toBe('true')
      expect(submitButton().disabled).toBe(false)
      expect(screen.queryByRole('alert')).toBeNull()
    }

    choose('OTHER')
    expect(within(dialog()).getByRole('alert').textContent).toBe(ru.today.complete.commentRequired)
    expect(submitButton().disabled).toBe(true)
    fireEvent.click(submitButton())
    fireEvent.change(screen.getByLabelText(ru.today.complete.comment), { target: { value: '   ' } })
    expect(submitButton().disabled).toBe(true)
    fireEvent.click(submitButton())
    expect(completeTask).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText(ru.today.complete.comment), { target: { value: '  свой итог  ' } })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(submitButton().disabled).toBe(false)
  })

  it('posts the selected outcome, stays modal, and removes the task only after refetch', async () => {
    show([todoTask, otherTask])
    const pending = deferred<CompleteResult>()
    vi.mocked(completeTask).mockReturnValue(pending.promise)

    render(<TodayTasksSection />)
    openComplete(todoTask.title)
    choose('FOLLOW_UP')
    fireEvent.click(submitButton())
    fireEvent.click(within(dialog()).getByRole('button', { name: ru.today.complete.submitting }))
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.pointerDown(document.getElementById('needs-to-do-heading') as HTMLElement)

    await waitFor(() => {
      expect(completeTask).toHaveBeenCalledTimes(1)
    })
    expect(completeTask).toHaveBeenCalledWith(
      'biz_1',
      todoTask.id,
      'FOLLOW_UP',
      '',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(
      (within(dialog()).getByRole('button', { name: ru.today.complete.submitting }) as HTMLButtonElement).disabled,
    ).toBe(true)
    expect(
      (within(dialog()).getByRole('button', { name: ru.common.cancel }) as HTMLButtonElement).disabled,
    ).toBe(true)
    expect(within(card(todoTask.title)).getByText(ru.today.taskStatus.TODO)).toBeTruthy()
    const background = document.getElementById('needs-to-do-heading')?.closest('section')
    expect(background?.closest('[aria-hidden="true"]')).not.toBeNull()
    expect(background?.closest('[data-aria-hidden="true"]')).not.toBeNull()
    expect(document.body.style.pointerEvents).toBe('none')
    const overlays = document.querySelectorAll('[data-state="open"].inset-0')
    expect(overlays.length).toBe(1)
    expect(overlays[0]?.classList.contains('pointer-events-none')).toBe(false)
    expect(dialog().contains(document.activeElement)).toBe(true)
    expect(screen.queryByRole('button', { name: ru.today.taskActions.start })).toBeNull()
    expect(startTask).not.toHaveBeenCalled()
    expect(rescheduleTask).not.toHaveBeenCalled()
    expect(refetch).not.toHaveBeenCalled()

    refetch.mockImplementation(() => {
      show([otherTask])
    })
    await act(async () => {
      pending.resolve({
        task: {
          id: todoTask.id,
          status: 'DONE',
          completedAt,
          completionOutcome: 'FOLLOW_UP',
          completionComment: null,
        },
      })
      await pending.promise
    })

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
    expect(refetch).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('heading', { name: todoTask.title })).toBeNull()
    expect(screen.getByRole('heading', { name: otherTask.title })).toBeTruthy()
    expect(within(card(otherTask.title)).getByText(ru.today.taskStatus.TODO)).toBeTruthy()
  })

  it('translates API errors, keeps the selection, and allows a retry', async () => {
    show([todoTask])
    vi.mocked(completeTask)
      .mockRejectedValueOnce(new BackendApiError(400, 'COMMENT_REQUIRED', 'raw', {}))
      .mockRejectedValueOnce(new BackendApiError(400, 'INVALID_OUTCOME', 'raw', {}))
      .mockRejectedValueOnce(new BackendApiError(400, 'INVALID_COMMENT', 'raw', {}))
      .mockRejectedValueOnce(new BackendApiError(409, 'TASK_STATUS_CONFLICT', 'raw', {}))
      .mockRejectedValueOnce(new BackendApiError(404, 'TASK_NOT_FOUND', 'Task not found.', {}))
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({
        task: {
          id: todoTask.id,
          status: 'DONE',
          completedAt,
          completionOutcome: 'OTHER',
          completionComment: 'свой итог',
        },
      })

    render(<TodayTasksSection />)
    openComplete(todoTask.title)
    choose('OTHER')
    fireEvent.change(screen.getByLabelText(ru.today.complete.comment), { target: { value: 'свой итог' } })

    const messages = [
      ru.today.complete.commentRequired,
      ru.today.complete.invalidOutcome,
      ru.today.complete.invalidComment,
      ru.today.complete.statusConflict,
      ru.today.complete.notFound,
      ru.today.complete.failed,
    ]
    for (const message of messages) {
      fireEvent.click(submitButton())
      await waitFor(() => {
        expect(within(dialog()).getByRole('alert').textContent).toBe(message)
      })
      expect(screen.queryByText('COMMENT_REQUIRED')).toBeNull()
      expect(screen.queryByText('INVALID_OUTCOME')).toBeNull()
      expect(screen.queryByText('INVALID_COMMENT')).toBeNull()
      expect(screen.queryByText('TASK_STATUS_CONFLICT')).toBeNull()
      expect(screen.queryByText('TASK_NOT_FOUND')).toBeNull()
      expect(screen.queryByText('network down')).toBeNull()
      expect(
        within(dialog()).getByRole('button', { name: ru.today.complete.outcomes.OTHER }).getAttribute('aria-pressed'),
      ).toBe('true')
      expect((screen.getByLabelText(ru.today.complete.comment) as HTMLTextAreaElement).value).toBe('свой итог')
      expect(refetch).not.toHaveBeenCalled()
    }

    refetch.mockImplementation(() => {
      show([])
    })
    fireEvent.click(submitButton())
    await waitFor(() => {
      expect(completeTask).toHaveBeenCalledTimes(7)
      expect(refetch).toHaveBeenCalledTimes(1)
    })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes the dialog on a business switch and ignores a late success', async () => {
    show([todoTask])
    const pending = deferred<CompleteResult>()
    vi.mocked(completeTask).mockReturnValue(pending.promise)

    const view = render(<TodayTasksSection />)
    openComplete(todoTask.title)
    choose('DECLINED')
    fireEvent.click(submitButton())
    await waitFor(() => {
      expect(completeTask).toHaveBeenCalledWith('biz_1', todoTask.id, 'DECLINED', '', expect.any(Object))
    })

    session.businessId = 'biz_2'
    show([otherTask])
    view.rerender(<TodayTasksSection />)
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
    openComplete(otherTask.title)

    await act(async () => {
      pending.resolve({
        task: {
          id: todoTask.id,
          status: 'DONE',
          completedAt,
          completionOutcome: 'DECLINED',
          completionComment: null,
        },
      })
      await pending.promise
    })

    expect(refetch).not.toHaveBeenCalled()
    expect(within(dialog()).getByText(otherTask.title)).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('ignores a late failure and a stale request for the same task id', async () => {
    const sharedTask = makeTask({
      id: 'task_x',
      title: 'Общая задача',
      status: 'TODO',
    })
    const requestA = deferred<CompleteResult>()
    const requestB = deferred<CompleteResult>()
    vi.mocked(completeTask).mockReturnValueOnce(requestA.promise).mockReturnValueOnce(requestB.promise)

    show([sharedTask])
    const view = render(<TodayTasksSection />)
    openComplete(sharedTask.title)
    choose('NO_RESPONSE')
    fireEvent.click(submitButton())
    await waitFor(() => {
      expect(completeTask).toHaveBeenCalledWith('biz_1', 'task_x', 'NO_RESPONSE', '', expect.any(Object))
    })

    session.businessId = 'biz_2'
    show([sharedTask])
    view.rerender(<TodayTasksSection />)
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    openComplete(sharedTask.title)
    choose('CONTACTED')
    fireEvent.click(submitButton())
    await waitFor(() => {
      expect(completeTask).toHaveBeenCalledWith('biz_2', 'task_x', 'CONTACTED', '', expect.any(Object))
    })

    await act(async () => {
      requestA.reject(new Error('stale failure'))
      await requestA.promise.catch(() => undefined)
    })

    expect(screen.queryByRole('alert')).toBeNull()
    expect(refetch).not.toHaveBeenCalled()
    expect(
      (within(dialog()).getByRole('button', { name: ru.today.complete.submitting }) as HTMLButtonElement).disabled,
    ).toBe(true)
    fireEvent.click(within(dialog()).getByRole('button', { name: ru.today.complete.submitting }))
    expect(completeTask).toHaveBeenCalledTimes(2)
    expect(refetch).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeTruthy()

    refetch.mockImplementation(() => {
      show([])
    })
    await act(async () => {
      requestB.resolve({
        task: {
          id: 'task_x',
          status: 'DONE',
          completedAt,
          completionOutcome: 'CONTACTED',
          completionComment: null,
        },
      })
      await requestB.promise
    })

    await waitFor(() => {
      expect(refetch).toHaveBeenCalledTimes(1)
    })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText(ru.today.emptyNeedsToDo)).toBeTruthy()
  })
})
