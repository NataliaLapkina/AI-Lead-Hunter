/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MissingTimeZoneError } from '@/domain/tasks/browserTimeZone'
import type { TodayTask } from '@/domain/tasks/todayTask'
import { ru } from '@/i18n/ru'
import { formatDateTime } from '@/lib/utils'
import { TodayTasksSection } from './TodayTasksSection'

const dueAt = '2026-10-11T09:30:00.000Z'

const task: TodayTask = {
  id: 'task_1',
  title: 'Позвонить клиенту',
  status: 'TODO',
  dueAt,
  priority: 'HIGH',
  isOverdue: false,
  company: { id: 'company_1', name: 'Северная верфь' },
  decision: { id: 'decision_1', title: 'Связаться сегодня', status: 'ACTIVE' },
}

const session = vi.hoisted(() => ({
  businessId: 'biz_1' as string | null,
}))

const listState = vi.hoisted(() => ({
  current: {
    data: { tasks: [] as TodayTask[] } as { tasks: TodayTask[] } | null,
    isLoading: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
}))

vi.mock('@/features/business/CurrentBusinessContext', () => ({
  useCurrentBusiness: () => ({ businessId: session.businessId }),
}))

vi.mock('@/features/today/useTodayTasks', () => ({
  useTodayTasks: () => listState.current,
}))

vi.mock('@/services/api/createTaskFromDecision', () => ({
  createTaskFromDecision: vi.fn(),
}))

import { createTaskFromDecision } from '@/services/api/createTaskFromDecision'

function show(tasks: TodayTask[], extra?: { error?: Error | null; isLoading?: boolean }) {
  const error = extra?.error ?? null
  const isLoading = extra?.isLoading ?? false
  listState.current = {
    data: error || isLoading ? null : { tasks },
    isLoading,
    error,
    refetch: listState.current.refetch,
  }
}

describe('TodayTasksSection', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    session.businessId = 'biz_1'
    show([])
  })

  it('shows a loading state without the empty message', () => {
    show([], { isLoading: true })

    render(<TodayTasksSection />)

    expect(screen.getByText(ru.common.loading)).toBeTruthy()
    expect(screen.queryByText(ru.today.emptyNeedsToDo)).toBeNull()
    expect(screen.queryByText(ru.today.tasksLoadError)).toBeNull()
  })

  it('renders a current task with company and decision', () => {
    show([task])

    render(<TodayTasksSection />)

    expect(screen.getByRole('heading', { name: task.title })).toBeTruthy()
    expect(screen.getByText(task.company?.name ?? '')).toBeTruthy()
    expect(screen.getByText(`${ru.today.decisionLabel} ${task.decision?.title}`)).toBeTruthy()
    expect(screen.getByText(ru.today.taskStatus.TODO)).toBeTruthy()
    expect(screen.getByText(ru.today.priority.HIGH)).toBeTruthy()
    expect(screen.getByText(formatDateTime(dueAt))).toBeTruthy()
    expect(screen.queryByText(ru.today.overdue)).toBeNull()
    expect(screen.getByRole('heading', { name: task.title }).closest('.rounded-xl')?.className).not.toContain(
      'border-destructive/40',
    )
  })

  it('renders null company and null decision without those labels', () => {
    show([{ ...task, company: null, decision: null }])

    render(<TodayTasksSection />)

    expect(screen.getByRole('heading', { name: task.title })).toBeTruthy()
    expect(screen.queryByText('Северная верфь')).toBeNull()
    expect(screen.queryByText(`${ru.today.decisionLabel} Связаться сегодня`)).toBeNull()
  })

  it('marks an overdue task without treating a current task as overdue', () => {
    show([
      { ...task, id: 'overdue', title: 'Просроченный звонок', isOverdue: true },
      { ...task, id: 'today', title: 'Звонок сегодня', isOverdue: false },
    ])

    render(<TodayTasksSection />)

    const overdueTitle = screen.getByRole('heading', { name: 'Просроченный звонок' })
    const todayTitle = screen.getByRole('heading', { name: 'Звонок сегодня' })

    expect(screen.getAllByText(ru.today.overdue)).toHaveLength(1)
    expect(overdueTitle.closest('.rounded-xl')?.className).toContain('border-destructive/40')
    expect(todayTitle.closest('.rounded-xl')?.className).not.toContain('border-destructive/40')
    expect(screen.getAllByText(ru.today.taskStatus.TODO)).toHaveLength(2)
    expect(screen.queryByText('TODO')).toBeNull()
    expect(screen.queryByText('IN_PROGRESS')).toBeNull()
  })

  it('shows a calm empty state', () => {
    show([])

    render(<TodayTasksSection />)

    expect(screen.getByText(ru.today.emptyNeedsToDo)).toBeTruthy()
    expect(screen.queryByText(ru.today.tasksLoadError)).toBeNull()
    expect(screen.queryByRole('button', { name: ru.today.retry })).toBeNull()
  })

  it('keeps an API error inside the section', () => {
    show([], { error: new Error('backend failed') })

    render(<TodayTasksSection />)

    expect(screen.getByRole('heading', { name: ru.today.needsToDo })).toBeTruthy()
    expect(screen.getByText(ru.today.tasksLoadError)).toBeTruthy()
    expect(screen.queryByText('backend failed')).toBeNull()
    expect(screen.getByRole('button', { name: ru.today.retry })).toBeTruthy()
  })

  it('explains a missing browser timezone without calling the task API', () => {
    show([], { error: new MissingTimeZoneError() })

    render(<TodayTasksSection />)

    expect(screen.getByText(ru.today.missingTimeZone)).toBeTruthy()
    expect(screen.queryByText(ru.today.tasksLoadError)).toBeNull()
  })

  it('does not write when the planned actions are activated', () => {
    show([task])
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<TodayTasksSection />)

    const startButton = screen.getByRole('button', { name: ru.today.taskActions.start }) as HTMLButtonElement
    expect(startButton.disabled).toBe(false)

    for (const name of [ru.today.taskActions.reschedule, ru.today.taskActions.complete]) {
      const button = screen.getByRole('button', { name }) as HTMLButtonElement
      expect(button.disabled).toBe(true)
      fireEvent.click(button)
    }

    expect(screen.getByText(ru.today.taskActions.unavailable)).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(createTaskFromDecision).not.toHaveBeenCalled()
    expect(screen.queryByText(ru.today.taskCreated)).toBeNull()
  })
})
