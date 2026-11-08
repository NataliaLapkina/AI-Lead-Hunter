/** @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TodayTask } from '@/domain/tasks/todayTask'
import { ru } from '@/i18n/ru'
import { formatDateTime } from '@/lib/utils'
import { BackendApiError } from '@/services/api/apiClient'
import { TodayTasksSection } from './TodayTasksSection'

const dueAt = '2026-10-11T09:30:00.000Z'
const fixedNow = new Date(2026, 10, 7, 15, 0, 0, 0)

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

import { rescheduleTask } from '@/services/api/rescheduleTask'
import { startTask } from '@/services/api/startTask'

type RescheduleResult = {
  task: { id: string; status: 'TODO' | 'IN_PROGRESS'; dueAt: string }
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

function openReschedule(title: string) {
  fireEvent.click(
    within(card(title)).getByRole('button', { name: ru.today.taskActions.reschedule, hidden: true }),
  )
}

function localIso(
  year: number,
  monthIndex: number,
  day: number,
  hour: number,
  minute: number,
  second = 0,
  millisecond = 0,
): string {
  return new Date(year, monthIndex, day, hour, minute, second, millisecond).toISOString()
}

function newDueText(iso: string): string {
  return `${ru.today.reschedule.newDue} ${formatDateTime(iso)}`
}

function submitButton(): HTMLButtonElement {
  return within(dialog()).getByRole('button', {
    name: ru.today.taskActions.reschedule,
  }) as HTMLButtonElement
}

describe('Today task reschedule', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(fixedNow)
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.clearAllMocks()
    session.businessId = 'biz_1'
    refetch.mockReset()
    vi.mocked(startTask).mockReset()
    vi.mocked(rescheduleTask).mockReset()
    show([])
  })

  it('opens from a TODO task and an in-progress task, and closes on cancel', () => {
    show([todoTask, progressTask])

    render(<TodayTasksSection />)

    const todoStart = within(card(todoTask.title)).getByRole('button', {
      name: ru.today.taskActions.start,
    }) as HTMLButtonElement
    const progressStart = within(card(progressTask.title)).getByRole('button', {
      name: ru.today.taskActions.start,
    }) as HTMLButtonElement
    expect(todoStart.disabled).toBe(false)
    expect(progressStart.disabled).toBe(true)

    for (const task of [todoTask, progressTask]) {
      const root = card(task.title)
      expect(
        (within(root).getByRole('button', { name: ru.today.taskActions.reschedule }) as HTMLButtonElement)
          .disabled,
      ).toBe(false)
      expect(
        (within(root).getByRole('button', { name: ru.today.taskActions.complete }) as HTMLButtonElement)
          .disabled,
      ).toBe(false)
    }

    openReschedule(todoTask.title)
    expect(within(dialog()).getByRole('heading', { name: ru.today.reschedule.title })).toBeTruthy()
    expect(within(dialog()).getByText(todoTask.title)).toBeTruthy()
    expect(within(dialog()).getByText(formatDateTime(todoTask.dueAt))).toBeTruthy()
    expect(submitButton().disabled).toBe(true)

    fireEvent.click(within(dialog()).getByRole('button', { name: ru.common.cancel }))
    expect(screen.queryByRole('dialog')).toBeNull()

    openReschedule(progressTask.title)
    expect(within(dialog()).getByText(progressTask.title)).toBeTruthy()
    fireEvent.click(within(dialog()).getByRole('button', { name: ru.common.cancel }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(rescheduleTask).not.toHaveBeenCalled()
    expect(startTask).not.toHaveBeenCalled()
  })

  it('keeps start behavior and leaves complete available', async () => {
    show([todoTask])
    vi.mocked(startTask).mockResolvedValue({ task: { id: todoTask.id, status: 'IN_PROGRESS' } })

    render(<TodayTasksSection />)
    fireEvent.click(screen.getByRole('button', { name: ru.today.taskActions.start }))

    await waitFor(() => {
      expect(startTask).toHaveBeenCalledWith('biz_1', todoTask.id, expect.objectContaining({
        signal: expect.any(AbortSignal),
      }))
    })
    expect(rescheduleTask).not.toHaveBeenCalled()
    expect(
      (screen.getByRole('button', { name: ru.today.taskActions.complete }) as HTMLButtonElement).disabled,
    ).toBe(false)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('offers later today as the current local time plus three hours on the same day', () => {
    show([todoTask])
    render(<TodayTasksSection />)
    openReschedule(todoTask.title)

    fireEvent.click(within(dialog()).getByRole('button', { name: ru.today.reschedule.laterToday }))

    const later = localIso(2026, 10, 7, 18, 0, 0, 0)
    expect(within(dialog()).getByText(newDueText(later))).toBeTruthy()
    expect(submitButton().disabled).toBe(false)
  })

  it('keeps later today unavailable when three hours cross the local day', () => {
    vi.setSystemTime(new Date(2026, 10, 7, 22, 0, 0, 0))
    show([todoTask])
    render(<TodayTasksSection />)
    openReschedule(todoTask.title)

    const later = within(dialog()).getByRole('button', {
      name: ru.today.reschedule.laterToday,
    }) as HTMLButtonElement
    expect(later.disabled).toBe(true)
    fireEvent.click(later)
    expect(screen.queryByText(new RegExp(ru.today.reschedule.newDue))).toBeNull()
    expect(submitButton().disabled).toBe(true)
    fireEvent.click(submitButton())
    expect(rescheduleTask).not.toHaveBeenCalled()
  })

  it('previews tomorrow and three days at local 10:00', () => {
    show([todoTask])
    render(<TodayTasksSection />)
    openReschedule(todoTask.title)

    fireEvent.click(within(dialog()).getByRole('button', { name: ru.today.reschedule.tomorrow }))
    expect(within(dialog()).getByText(newDueText(localIso(2026, 10, 8, 10, 0)))).toBeTruthy()

    fireEvent.click(within(dialog()).getByRole('button', { name: ru.today.reschedule.inThreeDays }))
    expect(within(dialog()).getByText(newDueText(localIso(2026, 10, 10, 10, 0)))).toBeTruthy()
    expect(screen.queryByText(newDueText(localIso(2026, 10, 8, 10, 0)))).toBeNull()
  })

  it('accepts a manual future datetime and rejects past, current, and normalized invalid times', () => {
    show([todoTask])
    render(<TodayTasksSection />)
    openReschedule(todoTask.title)

    const dateInput = screen.getByLabelText(ru.today.reschedule.date) as HTMLInputElement
    const timeInput = screen.getByLabelText(ru.today.reschedule.time) as HTMLInputElement
    expect(dateInput.value).toBe('2026-11-08')
    expect(timeInput.value).toBe('10:00')

    fireEvent.click(within(dialog()).getByRole('button', { name: ru.today.reschedule.pickDate }))
    const manual = localIso(2026, 10, 8, 10, 0)
    expect(within(dialog()).getByText(newDueText(manual))).toBeTruthy()

    fireEvent.change(dateInput, { target: { value: '2026-12-01' } })
    fireEvent.change(timeInput, { target: { value: '14:30' } })
    expect(within(dialog()).getByText(newDueText(localIso(2026, 11, 1, 14, 30)))).toBeTruthy()
    expect(submitButton().disabled).toBe(false)

    fireEvent.change(dateInput, { target: { value: '2026-11-06' } })
    expect(within(dialog()).getByRole('alert').textContent).toBe(ru.today.reschedule.notInFuture)
    expect(submitButton().disabled).toBe(true)
    fireEvent.click(submitButton())

    fireEvent.change(dateInput, { target: { value: '2026-11-07' } })
    fireEvent.change(timeInput, { target: { value: '15:00' } })
    expect(within(dialog()).getByRole('alert').textContent).toBe(ru.today.reschedule.notInFuture)
    expect(submitButton().disabled).toBe(true)

    fireEvent.change(dateInput, { target: { value: '2026-02-31' } })
    fireEvent.change(timeInput, { target: { value: '10:00' } })
    expect(within(dialog()).getByRole('alert').textContent).toBe(ru.today.reschedule.invalidLocalTime)
    expect(submitButton().disabled).toBe(true)
    fireEvent.click(submitButton())
    expect(rescheduleTask).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('posts the selected instant and refetches without changing the task first', async () => {
    show([todoTask, otherTask])
    const tomorrow = localIso(2026, 10, 8, 10, 0)
    const pending = deferred<RescheduleResult>()
    vi.mocked(rescheduleTask).mockReturnValue(pending.promise)

    render(<TodayTasksSection />)
    openReschedule(todoTask.title)
    fireEvent.click(within(dialog()).getByRole('button', { name: ru.today.reschedule.tomorrow }))
    fireEvent.click(submitButton())
    fireEvent.click(within(dialog()).getByRole('button', { name: ru.today.reschedule.submitting }))

    await waitFor(() => {
      expect(rescheduleTask).toHaveBeenCalledTimes(1)
    })
    expect(rescheduleTask).toHaveBeenCalledWith('biz_1', todoTask.id, tomorrow, expect.objectContaining({
      signal: expect.any(AbortSignal),
    }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(within(dialog()).getByRole('button', { name: ru.today.reschedule.submitting }).textContent).toBe(
      ru.today.reschedule.submitting,
    )
    expect(
      (within(dialog()).getByRole('button', { name: ru.today.reschedule.submitting }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    expect(within(card(todoTask.title)).getByText(formatDateTime(dueAt))).toBeTruthy()
    expect(within(card(todoTask.title)).queryByText(formatDateTime(tomorrow))).toBeNull()
    expect(within(card(todoTask.title)).getByText(ru.today.taskStatus.TODO)).toBeTruthy()
    expect(document.getElementById('needs-to-do-heading')?.closest('section')?.getAttribute('aria-busy')).toBe(
      'false',
    )

    const background = document.getElementById('needs-to-do-heading')?.closest('section')
    expect(background?.closest('[aria-hidden="true"]')).not.toBeNull()
    expect(background?.closest('[data-aria-hidden="true"]')).not.toBeNull()
    expect(screen.queryByRole('button', { name: ru.today.taskActions.start })).toBeNull()
    for (const title of [todoTask.title, otherTask.title]) {
      expect(
        within(card(title)).getByRole('button', {
          name: ru.today.taskActions.start,
          hidden: true,
        }),
      ).toBeTruthy()
    }
    expect(document.body.style.pointerEvents).toBe('none')
    const overlays = document.querySelectorAll('[data-state="open"].inset-0')
    expect(overlays.length).toBe(1)
    expect(overlays[0]?.classList.contains('pointer-events-none')).toBe(false)
    expect(dialog().contains(document.activeElement)).toBe(true)
    expect(startTask).not.toHaveBeenCalled()
    expect(rescheduleTask).toHaveBeenCalledTimes(1)
  })

  it('removes a task moved off today only after the refreshed list omits it', async () => {
    show([todoTask])
    const tomorrow = localIso(2026, 10, 8, 10, 0)
    vi.mocked(rescheduleTask).mockResolvedValue({
      task: { id: todoTask.id, status: 'TODO', dueAt: tomorrow },
    })
    refetch.mockImplementation(() => {
      show([])
    })

    render(<TodayTasksSection />)
    openReschedule(todoTask.title)
    fireEvent.click(within(dialog()).getByRole('button', { name: ru.today.reschedule.tomorrow }))
    fireEvent.click(submitButton())

    await waitFor(() => {
      expect(refetch).toHaveBeenCalledTimes(1)
    })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('heading', { name: todoTask.title })).toBeNull()
    expect(screen.getByText(ru.today.emptyNeedsToDo)).toBeTruthy()
  })

  it('keeps a task whose refreshed deadline is still today', async () => {
    show([todoTask])
    const later = localIso(2026, 10, 7, 18, 0)
    vi.mocked(rescheduleTask).mockResolvedValue({
      task: { id: todoTask.id, status: 'TODO', dueAt: later },
    })
    refetch.mockImplementation(() => {
      show([{ ...todoTask, dueAt: later }])
    })

    render(<TodayTasksSection />)
    openReschedule(todoTask.title)
    expect(screen.getAllByText(formatDateTime(dueAt)).length).toBeGreaterThan(0)
    fireEvent.click(within(dialog()).getByRole('button', { name: ru.today.reschedule.laterToday }))
    fireEvent.click(submitButton())

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
    expect(refetch).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('heading', { name: todoTask.title })).toBeTruthy()
    expect(screen.getByText(formatDateTime(later))).toBeTruthy()
    expect(screen.getByText(ru.today.taskStatus.TODO)).toBeTruthy()
  })

  it('translates API errors, keeps the dialog selection, and allows a retry', async () => {
    show([todoTask])
    const tomorrow = localIso(2026, 10, 8, 10, 0)
    vi.mocked(rescheduleTask)
      .mockRejectedValueOnce(new BackendApiError(400, 'DUE_AT_NOT_IN_FUTURE', 'dueAt must be in the future.', {}))
      .mockRejectedValueOnce(new BackendApiError(404, 'TASK_NOT_FOUND', 'Task not found.', {}))
      .mockRejectedValueOnce(new BackendApiError(409, 'TASK_STATUS_CONFLICT', 'raw code', {}))
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({ task: { id: todoTask.id, status: 'TODO', dueAt: tomorrow } })

    render(<TodayTasksSection />)
    openReschedule(todoTask.title)
    fireEvent.click(within(dialog()).getByRole('button', { name: ru.today.reschedule.tomorrow }))
    fireEvent.click(submitButton())

    await waitFor(() => {
      expect(within(dialog()).getByRole('alert').textContent).toBe(ru.today.reschedule.notInFuture)
    })
    expect(screen.queryByText('DUE_AT_NOT_IN_FUTURE')).toBeNull()
    expect(screen.queryByText('dueAt must be in the future.')).toBeNull()
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(
      within(dialog()).getByRole('button', { name: ru.today.reschedule.tomorrow }).getAttribute('aria-pressed'),
    ).toBe('true')
    expect(within(dialog()).getByText(newDueText(tomorrow))).toBeTruthy()
    expect(refetch).not.toHaveBeenCalled()

    fireEvent.click(submitButton())
    await waitFor(() => {
      expect(within(dialog()).getByRole('alert').textContent).toBe(ru.today.reschedule.notFound)
    })
    expect(screen.queryByText('TASK_NOT_FOUND')).toBeNull()
    expect(screen.queryByText('Task not found.')).toBeNull()

    fireEvent.click(submitButton())
    await waitFor(() => {
      expect(within(dialog()).getByRole('alert').textContent).toBe(ru.today.reschedule.statusConflict)
    })
    expect(screen.queryByText('TASK_STATUS_CONFLICT')).toBeNull()
    expect(screen.queryByText(ru.today.taskActions.statusConflict)).toBeNull()

    fireEvent.click(submitButton())
    await waitFor(() => {
      expect(within(dialog()).getByRole('alert').textContent).toBe(ru.today.reschedule.failed)
    })
    expect(screen.queryByText('network down')).toBeNull()
    expect(
      within(dialog()).getByRole('button', { name: ru.today.reschedule.tomorrow }).getAttribute('aria-pressed'),
    ).toBe('true')

    refetch.mockImplementation(() => {
      show([])
    })
    fireEvent.click(submitButton())
    await waitFor(() => {
      expect(rescheduleTask).toHaveBeenCalledTimes(5)
      expect(refetch).toHaveBeenCalledTimes(1)
    })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes the dialog on a business switch and ignores a late success', async () => {
    show([todoTask])
    const pending = deferred<RescheduleResult>()
    vi.mocked(rescheduleTask).mockReturnValue(pending.promise)

    const view = render(<TodayTasksSection />)
    openReschedule(todoTask.title)
    fireEvent.click(within(dialog()).getByRole('button', { name: ru.today.reschedule.tomorrow }))
    fireEvent.click(submitButton())
    await waitFor(() => {
      expect(rescheduleTask).toHaveBeenCalledWith('biz_1', todoTask.id, expect.any(String), expect.any(Object))
    })

    session.businessId = 'biz_2'
    show([otherTask])
    view.rerender(<TodayTasksSection />)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
    openReschedule(otherTask.title)
    expect(within(dialog()).getByText(otherTask.title)).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()

    await act(async () => {
      pending.resolve({ task: { id: todoTask.id, status: 'TODO', dueAt: localIso(2026, 10, 8, 10, 0) } })
      await pending.promise
    })

    expect(refetch).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(within(dialog()).getByText(otherTask.title)).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByText(ru.today.reschedule.submitting)).toBeNull()
  })

  it('ignores a late failure from the previous business', async () => {
    show([todoTask])
    const pending = deferred<RescheduleResult>()
    vi.mocked(rescheduleTask).mockReturnValue(pending.promise)

    const view = render(<TodayTasksSection />)
    openReschedule(todoTask.title)
    fireEvent.click(within(dialog()).getByRole('button', { name: ru.today.reschedule.tomorrow }))
    fireEvent.click(submitButton())
    await waitFor(() => {
      expect(rescheduleTask).toHaveBeenCalledTimes(1)
    })

    session.businessId = 'biz_2'
    show([otherTask])
    view.rerender(<TodayTasksSection />)
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
    openReschedule(otherTask.title)

    await act(async () => {
      pending.reject(new Error('business A failed'))
      await pending.promise.catch(() => undefined)
    })

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByText('business A failed')).toBeNull()
    expect(refetch).not.toHaveBeenCalled()
    expect(within(dialog()).getByText(otherTask.title)).toBeTruthy()
  })

  it('does not let a stale reschedule clear a newer request for the same task id', async () => {
    const sharedTask = makeTask({
      id: 'task_x',
      title: 'Общая задача',
      status: 'TODO',
    })
    const requestA = deferred<RescheduleResult>()
    const requestB = deferred<RescheduleResult>()
    vi.mocked(rescheduleTask)
      .mockReturnValueOnce(requestA.promise)
      .mockReturnValueOnce(requestB.promise)

    show([sharedTask])
    const view = render(<TodayTasksSection />)
    openReschedule(sharedTask.title)
    fireEvent.click(within(dialog()).getByRole('button', { name: ru.today.reschedule.tomorrow }))
    fireEvent.click(submitButton())
    await waitFor(() => {
      expect(rescheduleTask).toHaveBeenCalledWith('biz_1', 'task_x', expect.any(String), expect.any(Object))
    })

    session.businessId = 'biz_2'
    show([sharedTask])
    view.rerender(<TodayTasksSection />)
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
    expect(screen.queryByText(ru.today.reschedule.submitting)).toBeNull()

    openReschedule(sharedTask.title)
    fireEvent.click(within(dialog()).getByRole('button', { name: ru.today.reschedule.tomorrow }))
    fireEvent.click(submitButton())
    await waitFor(() => {
      expect(rescheduleTask).toHaveBeenCalledWith('biz_2', 'task_x', expect.any(String), expect.any(Object))
    })
    expect(within(dialog()).getByRole('button', { name: ru.today.reschedule.submitting })).toBeTruthy()

    await act(async () => {
      requestA.reject(new Error('stale failure'))
      await requestA.promise.catch(() => undefined)
    })

    expect(screen.queryByRole('alert')).toBeNull()
    expect(refetch).not.toHaveBeenCalled()
    expect(
      (within(dialog()).getByRole('button', { name: ru.today.reschedule.submitting }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    fireEvent.click(within(dialog()).getByRole('button', { name: ru.today.reschedule.submitting }))
    expect(rescheduleTask).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('dialog')).toBeTruthy()

    refetch.mockImplementation(() => {
      show([])
    })
    await act(async () => {
      requestB.resolve({ task: { id: 'task_x', status: 'IN_PROGRESS', dueAt: localIso(2026, 10, 8, 10, 0) } })
      await requestB.promise
    })

    await waitFor(() => {
      expect(refetch).toHaveBeenCalledTimes(1)
    })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText(ru.today.emptyNeedsToDo)).toBeTruthy()
  })

  it('does not let a stale success refetch or clear a newer request for the same task id', async () => {
    const sharedTask = makeTask({
      id: 'task_x',
      title: 'Общая задача',
      status: 'TODO',
    })
    const requestA = deferred<RescheduleResult>()
    const requestB = deferred<RescheduleResult>()
    vi.mocked(rescheduleTask)
      .mockReturnValueOnce(requestA.promise)
      .mockReturnValueOnce(requestB.promise)

    show([sharedTask])
    const view = render(<TodayTasksSection />)
    openReschedule(sharedTask.title)
    fireEvent.click(within(dialog()).getByRole('button', { name: ru.today.reschedule.tomorrow }))
    fireEvent.click(submitButton())
    await waitFor(() => {
      expect(rescheduleTask).toHaveBeenCalledTimes(1)
    })

    session.businessId = 'biz_2'
    show([sharedTask])
    view.rerender(<TodayTasksSection />)
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    openReschedule(sharedTask.title)
    fireEvent.click(within(dialog()).getByRole('button', { name: ru.today.reschedule.tomorrow }))
    fireEvent.click(submitButton())
    await waitFor(() => {
      expect(rescheduleTask).toHaveBeenCalledTimes(2)
    })

    await act(async () => {
      requestA.resolve({ task: { id: 'task_x', status: 'TODO', dueAt: localIso(2026, 10, 8, 10, 0) } })
      await requestA.promise
    })

    expect(refetch).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(
      (within(dialog()).getByRole('button', { name: ru.today.reschedule.submitting }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)

    refetch.mockImplementation(() => {
      show([{ ...sharedTask, status: 'IN_PROGRESS' }])
    })
    await act(async () => {
      requestB.resolve({ task: { id: 'task_x', status: 'IN_PROGRESS', dueAt: localIso(2026, 10, 8, 10, 0) } })
      await requestB.promise
    })

    await waitFor(() => {
      expect(refetch).toHaveBeenCalledTimes(1)
    })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText(ru.today.taskStatus.IN_PROGRESS)).toBeTruthy()
  })
})
