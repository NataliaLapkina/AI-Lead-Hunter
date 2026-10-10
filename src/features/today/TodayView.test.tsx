/** @vitest-environment jsdom */

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TodayTask } from '@/domain/tasks/todayTask'
import { ru } from '@/i18n/ru'
import { TodayView } from './TodayView'

const listState = vi.hoisted(() => ({
  current: {
    data: null as { tasks: TodayTask[] } | null,
    isLoading: false,
    error: new Error('tasks failed') as Error | null,
    refetch: vi.fn(),
  },
}))

vi.mock('@/features/today/NeedsDecisionSection', () => ({
  NeedsDecisionSection: () => <section>Нужно решить</section>,
}))

vi.mock('@/features/business/CurrentBusinessContext', () => ({
  useCurrentBusiness: () => ({ businessId: 'biz_1' }),
}))

vi.mock('@/features/today/useTodayTasks', () => ({
  useTodayTasks: () => listState.current,
}))

describe('TodayView', () => {
  afterEach(() => {
    cleanup()
  })

  it('keeps the needs-decision section when today tasks fail to load', () => {
    render(<TodayView />)

    expect(screen.getByText('Нужно решить')).toBeTruthy()
    expect(screen.getByRole('heading', { name: ru.today.needsToDo })).toBeTruthy()
    expect(screen.getByText(ru.today.tasksLoadError)).toBeTruthy()
  })
})
