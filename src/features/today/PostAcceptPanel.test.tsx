/** @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { acceptResultFixture } from '@/domain/decisions/decision.fixture'
import type { AcceptedDecision } from '@/domain/decisions/decision'
import { createdTaskFixture } from '@/domain/tasks/task.fixture'
import type { CreateTaskFromDecisionResult } from '@/domain/tasks/task'
import { BackendApiError } from '@/services/api/apiClient'
import { ru } from '@/i18n/ru'
import { formatDateTime } from '@/lib/utils'
import { POST_ACCEPT_CONFIRMATION_MS } from './usePostAcceptContinuation'
import { PostAcceptPanel } from './PostAcceptPanel'

vi.mock('@/features/business/CurrentBusinessContext', () => ({
  useCurrentBusiness: () => ({ businessId: 'biz_1' }),
}))

vi.mock('@/features/user/CurrentUserContext', () => ({
  useCurrentUser: () => ({ userId: 'user_1' }),
}))

vi.mock('@/services/api/createTaskFromDecision', () => ({
  createTaskFromDecision: vi.fn(),
}))

import { createTaskFromDecision } from '@/services/api/createTaskFromDecision'

describe('PostAcceptPanel', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('prefills Decision.title, defaults to MEDIUM, and submits the exact body', async () => {
    vi.mocked(createTaskFromDecision).mockResolvedValue({ task: createdTaskFixture })
    const onClosed = vi.fn()
    render(
      <PostAcceptPanel
        decision={acceptResultFixture.decision}
        continuationIdentity={1}
        onClosed={onClosed}
      />,
    )

    expect(screen.getByText(acceptResultFixture.decision.title)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.createTask }))

    const title = screen.getByLabelText(ru.today.taskTitle)
    expect((title as HTMLTextAreaElement).value).toBe(acceptResultFixture.decision.title)
    fireEvent.change(title, { target: { value: '  Другой звонок  ' } })
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.dueTomorrow }))
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.createTask }))

    await waitFor(() => {
      expect(createTaskFromDecision).toHaveBeenCalledTimes(1)
    })
    const input = vi.mocked(createTaskFromDecision).mock.calls[0]?.[0]
    expect(input?.businessId).toBe('biz_1')
    expect(input?.decisionId).toBe('dec_1')
    expect(input?.command).toEqual({
      createdById: 'user_1',
      title: 'Другой звонок',
      dueAt: expect.stringMatching(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
      ),
      priority: 'MEDIUM',
    })
    expect(input?.command).not.toHaveProperty('companyId')
    expect(input?.command).not.toHaveProperty('assignedToId')
    expect(input?.signal).toBeInstanceOf(AbortSignal)

    await waitFor(() => {
      expect(screen.getByText(ru.today.taskCreated)).toBeTruthy()
    })
    expect(screen.getByText(createdTaskFixture.title)).toBeTruthy()
    expect(
      screen.getByText(formatDateTime(createdTaskFixture.dueAt as string)),
    ).toBeTruthy()

    await waitFor(() => {
      expect(onClosed).toHaveBeenCalledTimes(1)
      expect(onClosed).toHaveBeenCalledWith(1)
    }, { timeout: POST_ACCEPT_CONFIRMATION_MS + 1000 })
  })

  it('does not POST a past custom date and preserves the form on error', async () => {
    vi.mocked(createTaskFromDecision).mockRejectedValue(
      new BackendApiError(400, 'INVALID_TASK_TITLE', 'raw code', {}),
    )
    render(
      <PostAcceptPanel
        decision={acceptResultFixture.decision}
        continuationIdentity={1}
        onClosed={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.createTask }))
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.duePickDate }))
    fireEvent.change(screen.getByLabelText(ru.today.actions.duePickDate), {
      target: { value: '2020-01-01' },
    })
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.createTask }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe(ru.today.invalidTaskDueAt)
    })
    expect(createTaskFromDecision).not.toHaveBeenCalled()
    expect((screen.getByLabelText(ru.today.taskTitle) as HTMLTextAreaElement).value).toBe(
      acceptResultFixture.decision.title,
    )

    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.dueTomorrow }))
    fireEvent.change(screen.getByLabelText(ru.today.taskTitle), {
      target: { value: 'Сохранённый заголовок' },
    })
    fireEvent.click(screen.getByRole('button', { name: ru.today.retry }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe(ru.today.invalidTaskTitle)
    })
    expect(screen.getByRole('alert').textContent).not.toContain('INVALID_TASK_TITLE')
    expect((screen.getByLabelText(ru.today.taskTitle) as HTMLTextAreaElement).value).toBe(
      'Сохранённый заголовок',
    )
    expect(screen.getByText(acceptResultFixture.decision.title)).toBeTruthy()
  })

  it('does not POST an invalid custom calendar date 2026-02-30', async () => {
    render(
      <PostAcceptPanel
        decision={acceptResultFixture.decision}
        continuationIdentity={1}
        onClosed={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.createTask }))
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.duePickDate }))
    fireEvent.change(screen.getByLabelText(ru.today.actions.duePickDate), {
      target: { value: '2026-02-30' },
    })
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.createTask }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe(ru.today.invalidTaskDueAt)
    })
    expect(createTaskFromDecision).not.toHaveBeenCalled()
  })

  it('does not let a C1 success timer close C2 for the same recommendation', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 27, 10, 0, 0, 0))
    vi.mocked(createTaskFromDecision).mockResolvedValue({ task: createdTaskFixture })

    const decisionC1: AcceptedDecision = {
      ...acceptResultFixture.decision,
      id: 'dec_1',
      title: 'Решение C1',
    }
    const decisionC2: AcceptedDecision = {
      ...acceptResultFixture.decision,
      id: 'dec_2',
      title: 'Решение C2',
    }

    function Host() {
      const [current, setCurrent] = useState({
        identity: 1,
        decision: decisionC1,
      })

      return (
        <div>
          <button
            type="button"
            onClick={() => setCurrent({ identity: 2, decision: decisionC2 })}
          >
            replace-continuation
          </button>
          <PostAcceptPanel
            key={current.identity}
            decision={current.decision}
            continuationIdentity={current.identity}
            onClosed={(identity) => {
              setCurrent((item) =>
                item.identity === identity
                  ? { identity: -1, decision: item.decision }
                  : item,
              )
            }}
          />
        </div>
      )
    }

    render(<Host />)
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.createTask }))
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.dueTomorrow }))
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.createTask }))

    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.getByText(ru.today.taskCreated)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'replace-continuation' }))
    expect(screen.getByText('Решение C2')).toBeTruthy()
    expect(screen.getByText(ru.today.accepted)).toBeTruthy()
    expect(screen.queryByText(ru.today.taskCreated)).toBeNull()

    await act(async () => {
      vi.advanceTimersByTime(POST_ACCEPT_CONFIRMATION_MS)
    })

    expect(screen.getByText('Решение C2')).toBeTruthy()
    expect(screen.getByText(ru.today.accepted)).toBeTruthy()
    expect(screen.queryByText('Решение C1')).toBeNull()
    expect(screen.queryByText(ru.today.taskCreated)).toBeNull()
  })

  it('cleans up the success timer on unmount', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 27, 10, 0, 0, 0))
    vi.mocked(createTaskFromDecision).mockResolvedValue({ task: createdTaskFixture })
    const onClosed = vi.fn()
    const { unmount } = render(
      <PostAcceptPanel
        decision={acceptResultFixture.decision}
        continuationIdentity={1}
        onClosed={onClosed}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.createTask }))
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.dueTomorrow }))
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.createTask }))

    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.getByText(ru.today.taskCreated)).toBeTruthy()

    unmount()
    await act(async () => {
      vi.advanceTimersByTime(POST_ACCEPT_CONFIRMATION_MS)
    })
    expect(onClosed).not.toHaveBeenCalled()
  })

  it('ignores late D1 success and error after same-Business C2 replacement', async () => {
    let resolveD1: ((value: CreateTaskFromDecisionResult) => void) | undefined
    let rejectD1: ((error: Error) => void) | undefined
    vi.mocked(createTaskFromDecision)
      .mockImplementationOnce(
        () =>
          new Promise<CreateTaskFromDecisionResult>((resolve) => {
            resolveD1 = resolve
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<CreateTaskFromDecisionResult>((_resolve, reject) => {
            rejectD1 = reject
          }),
      )

    const decisionD1: AcceptedDecision = {
      ...acceptResultFixture.decision,
      id: 'dec_1',
      title: 'Title D1',
    }
    const decisionD2: AcceptedDecision = {
      ...acceptResultFixture.decision,
      id: 'dec_2',
      title: 'Title D2',
    }

    const { rerender } = render(
      <PostAcceptPanel
        key={1}
        decision={decisionD1}
        continuationIdentity={1}
        onClosed={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.createTask }))
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.dueTomorrow }))
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.createTask }))

    await waitFor(() => {
      expect(createTaskFromDecision).toHaveBeenCalledTimes(1)
    })

    rerender(
      <PostAcceptPanel
        key={2}
        decision={decisionD2}
        continuationIdentity={2}
        onClosed={vi.fn()}
      />,
    )

    expect(screen.getByText('Title D2')).toBeTruthy()
    expect(screen.queryByText(ru.today.taskCreated)).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.createTask }))
    expect((screen.getByLabelText(ru.today.taskTitle) as HTMLTextAreaElement).value).toBe(
      'Title D2',
    )

    resolveD1?.({
      task: { ...createdTaskFixture, title: 'Task D1', decisionId: 'dec_1' },
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.queryByText('Task D1')).toBeNull()
    expect(screen.queryByText(ru.today.taskCreated)).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
    expect((screen.getByLabelText(ru.today.taskTitle) as HTMLTextAreaElement).value).toBe(
      'Title D2',
    )

    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.dueTomorrow }))
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.createTask }))
    await waitFor(() => {
      expect(createTaskFromDecision).toHaveBeenCalledTimes(2)
    })

    rerender(
      <PostAcceptPanel
        key={3}
        decision={{ ...decisionD2, id: 'dec_3', title: 'Title D3' }}
        continuationIdentity={3}
        onClosed={vi.fn()}
      />,
    )
    rejectD1?.(new BackendApiError(409, 'DECISION_STATUS_CONFLICT', 'raw', {}))
    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.getByText('Title D3')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByText('Task D1')).toBeNull()
    expect(screen.queryByText(ru.today.taskCreated)).toBeNull()
  })

  it('ignores a late D1 error after same-Business C2 replacement', async () => {
    let rejectD1: ((error: Error) => void) | undefined
    vi.mocked(createTaskFromDecision).mockImplementationOnce(
      () =>
        new Promise<CreateTaskFromDecisionResult>((_resolve, reject) => {
          rejectD1 = reject
        }),
    )

    const { rerender } = render(
      <PostAcceptPanel
        key={1}
        decision={{ ...acceptResultFixture.decision, id: 'dec_1', title: 'Title D1' }}
        continuationIdentity={1}
        onClosed={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.createTask }))
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.dueTomorrow }))
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.createTask }))

    await waitFor(() => {
      expect(createTaskFromDecision).toHaveBeenCalledTimes(1)
    })

    rerender(
      <PostAcceptPanel
        key={2}
        decision={{ ...acceptResultFixture.decision, id: 'dec_2', title: 'Title D2' }}
        continuationIdentity={2}
        onClosed={vi.fn()}
      />,
    )

    rejectD1?.(new BackendApiError(409, 'DECISION_STATUS_CONFLICT', 'raw', {}))
    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByText('Title D2')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByText(ru.today.taskCreated)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.createTask }))
    expect((screen.getByLabelText(ru.today.taskTitle) as HTMLTextAreaElement).value).toBe(
      'Title D2',
    )
  })
})
