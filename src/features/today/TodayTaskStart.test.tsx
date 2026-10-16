/** @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TodayTask } from '@/domain/tasks/todayTask'
import { ru } from '@/i18n/ru'
import { BackendApiError } from '@/services/api/apiClient'
import { TodayTasksSection } from './TodayTasksSection'
import { useStartTodayTask } from './useStartTodayTask'

const dueAt = '2026-10-11T09:30:00.000Z'

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

import { startTask } from '@/services/api/startTask'

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
  const heading = screen.getByRole('heading', { name: title })
  const root = heading.closest('.rounded-xl')
  if (!root) {
    throw new Error(`Card for ${title} was not found.`)
  }

  return root as HTMLElement
}

describe('Today task start', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    session.businessId = 'biz_1'
    refetch.mockReset()
    vi.mocked(startTask).mockReset()
    show([])
  })

  it('enables start only for a TODO task and keeps the other actions disabled', () => {
    show([todoTask, { ...todoTask, id: 'task_progress', title: 'Уже в работе', status: 'IN_PROGRESS' }])

    render(<TodayTasksSection />)

    const todoStart = within(card(todoTask.title)).getByRole('button', {
      name: ru.today.taskActions.start,
    }) as HTMLButtonElement
    const progressStart = within(card('Уже в работе')).getByRole('button', {
      name: ru.today.taskActions.start,
    }) as HTMLButtonElement

    expect(todoStart.disabled).toBe(false)
    expect(todoStart.type).toBe('button')
    expect(progressStart.disabled).toBe(true)
    fireEvent.click(progressStart)
    expect(startTask).not.toHaveBeenCalled()

    for (const title of [todoTask.title, 'Уже в работе']) {
      const root = card(title)
      expect(
        (within(root).getByRole('button', { name: ru.today.taskActions.reschedule }) as HTMLButtonElement)
          .disabled,
      ).toBe(true)
      expect(
        (within(root).getByRole('button', { name: ru.today.taskActions.complete }) as HTMLButtonElement)
          .disabled,
      ).toBe(true)
    }
    expect(screen.getAllByText(ru.today.taskActions.unavailable).length).toBeGreaterThan(0)
  })

  it('posts the current business and task, then refetches without changing status early', async () => {
    show([todoTask])
    const pending = deferred<{ task: { id: string; status: 'IN_PROGRESS' } }>()
    vi.mocked(startTask).mockReturnValue(pending.promise)

    render(<TodayTasksSection />)
    fireEvent.click(screen.getByRole('button', { name: ru.today.taskActions.start }))

    await waitFor(() => {
      expect(startTask).toHaveBeenCalledTimes(1)
    })
    expect(startTask).toHaveBeenCalledWith('biz_1', todoTask.id, expect.objectContaining({
      signal: expect.any(AbortSignal),
    }))
    expect(screen.getByText(ru.today.taskStatus.TODO)).toBeTruthy()
    expect(screen.queryByText(ru.today.taskStatus.IN_PROGRESS)).toBeNull()
    expect(screen.getByRole('button', { name: ru.today.taskActions.starting }).getAttribute('aria-busy')).toBe(
      'true',
    )

    await act(async () => {
      pending.resolve({ task: { id: todoTask.id, status: 'IN_PROGRESS' } })
      await pending.promise
    })

    await waitFor(() => {
      expect(refetch).toHaveBeenCalledTimes(1)
    })
    expect(screen.getByRole('heading', { name: todoTask.title })).toBeTruthy()
    expect(screen.getByText(ru.today.taskStatus.TODO)).toBeTruthy()
    expect(screen.queryByText(ru.today.taskStatus.IN_PROGRESS)).toBeNull()
  })

  it('shows the refetched task as in progress and keeps it in the list', async () => {
    show([todoTask])
    vi.mocked(startTask).mockResolvedValue({ task: { id: todoTask.id, status: 'IN_PROGRESS' } })
    refetch.mockImplementation(() => {
      show([{ ...todoTask, status: 'IN_PROGRESS' }])
    })

    render(<TodayTasksSection />)
    fireEvent.click(screen.getByRole('button', { name: ru.today.taskActions.start }))

    await waitFor(() => {
      expect(screen.getByText(ru.today.taskStatus.IN_PROGRESS)).toBeTruthy()
    })
    expect(screen.getByRole('heading', { name: todoTask.title })).toBeTruthy()
    expect(screen.queryByText(ru.today.taskStatus.TODO)).toBeNull()
    expect(
      (screen.getByRole('button', { name: ru.today.taskActions.start }) as HTMLButtonElement).disabled,
    ).toBe(true)
  })

  it('does not send a second start while the first request is pending', async () => {
    show([todoTask, otherTask])
    const pending = deferred<{ task: { id: string; status: 'IN_PROGRESS' } }>()
    vi.mocked(startTask).mockReturnValue(pending.promise)

    render(<TodayTasksSection />)
    const firstStart = within(card(todoTask.title)).getByRole('button', {
      name: ru.today.taskActions.start,
    })
    fireEvent.click(firstStart)
    fireEvent.click(firstStart)

    await waitFor(() => {
      expect(startTask).toHaveBeenCalledTimes(1)
    })
    const pendingButton = within(card(todoTask.title)).getByRole('button', {
      name: ru.today.taskActions.starting,
    }) as HTMLButtonElement
    expect(pendingButton.disabled).toBe(true)
    fireEvent.click(pendingButton)
    expect(startTask).toHaveBeenCalledTimes(1)

    const otherStart = within(card(otherTask.title)).getByRole('button', {
      name: ru.today.taskActions.start,
    }) as HTMLButtonElement
    expect(otherStart.disabled).toBe(false)
    expect(screen.getAllByText(ru.today.taskStatus.TODO)).toHaveLength(2)
    expect(screen.queryByText(ru.today.taskStatus.IN_PROGRESS)).toBeNull()
  })

  it('keeps the task and shows a local error that can be retried', async () => {
    show([todoTask])
    vi.mocked(startTask)
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({ task: { id: todoTask.id, status: 'IN_PROGRESS' } })

    render(<TodayTasksSection />)
    fireEvent.click(screen.getByRole('button', { name: ru.today.taskActions.start }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe(ru.today.actionFailed)
    })
    expect(screen.getByRole('heading', { name: todoTask.title })).toBeTruthy()
    expect(screen.getByText(ru.today.taskStatus.TODO)).toBeTruthy()
    expect(refetch).not.toHaveBeenCalled()
    expect(screen.queryByText(ru.today.tasksLoadError)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: ru.today.taskActions.start }))
    await waitFor(() => {
      expect(startTask).toHaveBeenCalledTimes(2)
      expect(refetch).toHaveBeenCalledTimes(1)
    })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('translates a status conflict and a missing task without leaving the card', async () => {
    show([todoTask])
    vi.mocked(startTask).mockRejectedValueOnce(
      new BackendApiError(409, 'TASK_STATUS_CONFLICT', 'raw code', {}),
    )

    render(<TodayTasksSection />)
    fireEvent.click(screen.getByRole('button', { name: ru.today.taskActions.start }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe(ru.today.taskActions.statusConflict)
    })
    expect(screen.queryByText('raw code')).toBeNull()
    expect(screen.queryByText('TASK_STATUS_CONFLICT')).toBeNull()
    expect(screen.getByText(ru.today.taskStatus.TODO)).toBeTruthy()

    vi.mocked(startTask).mockRejectedValueOnce(
      new BackendApiError(404, 'TASK_NOT_FOUND', 'Task not found.', {}),
    )
    fireEvent.click(screen.getByRole('button', { name: ru.today.taskActions.start }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe(ru.today.taskActions.notFound)
    })
    expect(screen.getByRole('heading', { name: todoTask.title })).toBeTruthy()
    expect(refetch).not.toHaveBeenCalled()
  })

  it('does not apply a start result after the business changes', async () => {
    show([todoTask])
    const pending = deferred<{ task: { id: string; status: 'IN_PROGRESS' } }>()
    vi.mocked(startTask).mockReturnValue(pending.promise)

    const view = render(<TodayTasksSection />)
    fireEvent.click(screen.getByRole('button', { name: ru.today.taskActions.start }))
    await waitFor(() => {
      expect(startTask).toHaveBeenCalledWith('biz_1', todoTask.id, expect.any(Object))
    })

    session.businessId = 'biz_2'
    show([otherTask])
    view.rerender(<TodayTasksSection />)

    await act(async () => {
      pending.resolve({ task: { id: todoTask.id, status: 'IN_PROGRESS' } })
      await pending.promise
    })

    expect(refetch).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: otherTask.title })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: todoTask.title })).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByText(ru.today.taskStatus.IN_PROGRESS)).toBeNull()
    expect(
      (within(card(otherTask.title)).getByRole('button', {
        name: ru.today.taskActions.start,
      }) as HTMLButtonElement).disabled,
    ).toBe(false)
  })

  it('ignores a late failure from the previous business', async () => {
    show([todoTask])
    const requestA = deferred<{ task: { id: string; status: 'IN_PROGRESS' } }>()
    vi.mocked(startTask).mockReturnValueOnce(requestA.promise)

    const view = render(<TodayTasksSection />)
    fireEvent.click(screen.getByRole('button', { name: ru.today.taskActions.start }))
    await waitFor(() => {
      expect(startTask).toHaveBeenCalledTimes(1)
    })

    session.businessId = 'biz_2'
    show([otherTask])
    view.rerender(<TodayTasksSection />)

    const businessBStart = within(card(otherTask.title)).getByRole('button', {
      name: ru.today.taskActions.start,
    }) as HTMLButtonElement
    expect(businessBStart.disabled).toBe(false)

    await act(async () => {
      requestA.reject(new Error('business A failed'))
      await requestA.promise.catch(() => undefined)
    })

    expect(screen.getByRole('heading', { name: otherTask.title })).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByText(ru.today.taskActions.starting)).toBeNull()
    expect(
      (within(card(otherTask.title)).getByRole('button', {
        name: ru.today.taskActions.start,
      }) as HTMLButtonElement).disabled,
    ).toBe(false)
    expect(refetch).not.toHaveBeenCalled()
    expect(startTask).toHaveBeenCalledTimes(1)
  })

  it('does not let a stale start clear a newer request for the same task id', async () => {
    const sharedTask = makeTask({
      id: 'task_x',
      title: 'Общая задача',
      status: 'TODO',
    })
    const requestA = deferred<{ task: { id: string; status: 'IN_PROGRESS' } }>()
    const requestB = deferred<{ task: { id: string; status: 'IN_PROGRESS' } }>()
    vi.mocked(startTask)
      .mockReturnValueOnce(requestA.promise)
      .mockReturnValueOnce(requestB.promise)

    show([sharedTask])
    const view = render(<TodayTasksSection />)
    fireEvent.click(screen.getByRole('button', { name: ru.today.taskActions.start }))
    await waitFor(() => {
      expect(startTask).toHaveBeenCalledWith('biz_1', 'task_x', expect.any(Object))
    })

    session.businessId = 'biz_2'
    show([sharedTask])
    view.rerender(<TodayTasksSection />)
    await waitFor(() => {
      expect(
        (screen.getByRole('button', { name: ru.today.taskActions.start }) as HTMLButtonElement)
          .disabled,
      ).toBe(false)
    })
    fireEvent.click(screen.getByRole('button', { name: ru.today.taskActions.start }))
    await waitFor(() => {
      expect(startTask).toHaveBeenCalledWith('biz_2', 'task_x', expect.any(Object))
    })
    expect(
      (screen.getByRole('button', { name: ru.today.taskActions.starting }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)

    await act(async () => {
      requestA.resolve({ task: { id: 'task_x', status: 'IN_PROGRESS' } })
      await requestA.promise
    })

    expect(refetch).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(
      (screen.getByRole('button', { name: ru.today.taskActions.starting }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)

    refetch.mockImplementation(() => {
      show([{ ...sharedTask, status: 'IN_PROGRESS' }])
    })
    await act(async () => {
      requestB.resolve({ task: { id: 'task_x', status: 'IN_PROGRESS' } })
      await requestB.promise
    })

    await waitFor(() => {
      expect(refetch).toHaveBeenCalledTimes(1)
    })
    expect(screen.getByText(ru.today.taskStatus.IN_PROGRESS)).toBeTruthy()
    expect(
      (screen.getByRole('button', { name: ru.today.taskActions.start }) as HTMLButtonElement).disabled,
    ).toBe(true)
  })

  it('does not let a late rejection clear a newer request for the same task id', async () => {
    const sharedTask = makeTask({
      id: 'task_x',
      title: 'Общая задача',
      status: 'TODO',
    })
    const requestA = deferred<{ task: { id: string; status: 'IN_PROGRESS' } }>()
    const requestB = deferred<{ task: { id: string; status: 'IN_PROGRESS' } }>()
    vi.mocked(startTask)
      .mockReturnValueOnce(requestA.promise)
      .mockReturnValueOnce(requestB.promise)

    show([sharedTask])
    const view = render(<TodayTasksSection />)
    fireEvent.click(screen.getByRole('button', { name: ru.today.taskActions.start }))
    await waitFor(() => {
      expect(startTask).toHaveBeenCalledWith('biz_1', 'task_x', expect.any(Object))
    })

    session.businessId = 'biz_2'
    show([sharedTask])
    view.rerender(<TodayTasksSection />)
    await waitFor(() => {
      expect(
        (screen.getByRole('button', { name: ru.today.taskActions.start }) as HTMLButtonElement)
          .disabled,
      ).toBe(false)
    })
    fireEvent.click(screen.getByRole('button', { name: ru.today.taskActions.start }))
    await waitFor(() => {
      expect(startTask).toHaveBeenCalledWith('biz_2', 'task_x', expect.any(Object))
    })

    await act(async () => {
      requestA.reject(new Error('stale failure'))
      await requestA.promise.catch(() => undefined)
    })

    expect(screen.queryByRole('alert')).toBeNull()
    expect(refetch).not.toHaveBeenCalled()
    expect(
      (screen.getByRole('button', { name: ru.today.taskActions.starting }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: ru.today.taskActions.starting }))
    expect(startTask).toHaveBeenCalledTimes(2)

    refetch.mockImplementation(() => {
      show([{ ...sharedTask, status: 'IN_PROGRESS' }])
    })
    await act(async () => {
      requestB.resolve({ task: { id: 'task_x', status: 'IN_PROGRESS' } })
      await requestB.promise
    })

    await waitFor(() => {
      expect(refetch).toHaveBeenCalledTimes(1)
    })
    expect(screen.getByText(ru.today.taskStatus.IN_PROGRESS)).toBeTruthy()
  })
})

describe('useStartTodayTask request identity', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    refetch.mockReset()
    vi.mocked(startTask).mockReset()
  })

  it('keeps the newer request booked when the older one is rejected', async () => {
    const requestA = deferred<{ task: { id: string; status: 'IN_PROGRESS' } }>()
    const requestB = deferred<{ task: { id: string; status: 'IN_PROGRESS' } }>()
    vi.mocked(startTask)
      .mockReturnValueOnce(requestA.promise)
      .mockReturnValueOnce(requestB.promise)

    const view = renderHook(
      ({ businessId }: { businessId: string }) => useStartTodayTask(businessId, refetch),
      { initialProps: { businessId: 'biz_a' } },
    )

    act(() => {
      view.result.current.start('task_x')
    })
    await waitFor(() => {
      expect(startTask).toHaveBeenCalledTimes(1)
    })

    view.rerender({ businessId: 'biz_b' })
    act(() => {
      view.result.current.start('task_x')
    })
    await waitFor(() => {
      expect(startTask).toHaveBeenCalledTimes(2)
    })
    expect(view.result.current.isPending('task_x')).toBe(true)

    await act(async () => {
      requestA.reject(new Error('stale failure'))
      await requestA.promise.catch(() => undefined)
    })

    expect(view.result.current.isPending('task_x')).toBe(true)
    expect(view.result.current.errorFor('task_x')).toBeNull()
    act(() => {
      view.result.current.start('task_x')
    })
    expect(startTask).toHaveBeenCalledTimes(2)

    await act(async () => {
      requestB.resolve({ task: { id: 'task_x', status: 'IN_PROGRESS' } })
      await requestB.promise
    })
    expect(refetch).toHaveBeenCalledTimes(1)
    expect(view.result.current.isPending('task_x')).toBe(false)
  })
})
