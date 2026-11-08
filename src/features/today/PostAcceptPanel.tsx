import { useEffect, useId, useRef, useState } from 'react'
import type { AcceptedDecision } from '@/domain/decisions/decision'
import type { CreatedTask } from '@/domain/tasks/task'
import { getTaskDateInputMin, isTodayDueAtAvailable } from '@/domain/tasks/taskDueAt'
import { CreateTaskFromDecisionForm } from '@/features/today/CreateTaskFromDecisionForm'
import {
  useCreateTaskFromDecision,
  type CreateTaskAttempt,
  type CreateTaskDueOption,
} from '@/features/today/useCreateTaskFromDecision'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ru } from '@/i18n/ru'
import { formatDateTime } from '@/lib/utils'

export function PostAcceptPanel({
  decision,
  continuationIdentity,
  onClosed,
  onTaskCreated,
}: {
  decision: AcceptedDecision
  continuationIdentity: number
  onClosed: (identity: number) => void
  onTaskCreated?: () => void
}) {
  const [phase, setPhase] = useState<'choose' | 'form' | 'remind' | 'created'>('choose')
  const [dueOption, setDueOption] = useState<CreateTaskDueOption | null>(null)
  const [customDate, setCustomDate] = useState('')
  const [createdTask, setCreatedTask] = useState<CreatedTask | null>(null)
  const [createdFrom, setCreatedFrom] = useState<'task' | 'reminder' | null>(null)
  const { submitting, actionError, submit, clearActionError } =
    useCreateTaskFromDecision(decision.id, continuationIdentity)
  const customDateId = useId()
  const todayAvailable = isTodayDueAtAvailable()
  const onTaskCreatedRef = useRef(onTaskCreated)
  const mountedRef = useRef(true)
  onTaskCreatedRef.current = onTaskCreated

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  function handleTaskResult(
    result: CreateTaskAttempt,
    source: 'task' | 'reminder',
  ): void {
    if (result.status !== 'success' || !mountedRef.current) {
      return
    }

    setCreatedFrom(source)
    setCreatedTask(result.task)
    setPhase('created')
    onTaskCreatedRef.current?.()
  }

  function resetBranchDueState(): void {
    setDueOption(null)
    setCustomDate('')
    clearActionError()
  }

  function submitReminder(option: CreateTaskDueOption, date = customDate): void {
    void submit({
      title: decision.title,
      dueOption: option,
      customDate: date,
      priority: 'MEDIUM',
    }).then((result) => handleTaskResult(result, 'reminder'))
  }

  if (phase === 'created' && createdTask) {
    const isReminder = createdFrom === 'reminder'
    const dueAtLabel = createdTask.dueAt ? formatDateTime(createdTask.dueAt) : null

    return (
      <div className="space-y-3">
        <p className="text-sm font-medium">
          {isReminder ? ru.today.reminderCreated : ru.today.taskCreated}
        </p>
        {isReminder && dueAtLabel ? (
          <p className="text-sm text-muted-foreground">
            {`${ru.today.remindAt} ${dueAtLabel}`}
          </p>
        ) : null}
        <p className="text-sm">{createdTask.title}</p>
        {!isReminder && dueAtLabel ? (
          <p className="text-sm text-muted-foreground">{dueAtLabel}</p>
        ) : null}
        <Button
          type="button"
          size="sm"
          onClick={() => {
            onClosed(continuationIdentity)
          }}
        >
          {ru.today.actions.done}
        </Button>
      </div>
    )
  }

  if (phase === 'choose') {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium">{ru.today.accepted}</p>
        <p className="text-sm">{decision.title}</p>
        <p className="text-sm text-muted-foreground">{ru.today.whatNext}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              resetBranchDueState()
              setPhase('form')
            }}
          >
            {ru.today.actions.createTask}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              resetBranchDueState()
              setPhase('remind')
            }}
          >
            {ru.today.actions.doItMyself}
          </Button>
        </div>
      </div>
    )
  }

  if (phase === 'remind') {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium">{ru.today.doItMyself}</p>
        <p className="text-sm text-muted-foreground">{ru.today.remindAboutThis}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={dueOption === 'today' ? 'default' : 'secondary'}
            disabled={submitting || !todayAvailable}
            onClick={() => {
              setDueOption('today')
              submitReminder('today')
            }}
          >
            {ru.today.actions.dueToday}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={dueOption === 'tomorrow' ? 'default' : 'secondary'}
            disabled={submitting}
            onClick={() => {
              setDueOption('tomorrow')
              submitReminder('tomorrow')
            }}
          >
            {ru.today.actions.dueTomorrow}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={dueOption === 'custom' ? 'default' : 'secondary'}
            disabled={submitting}
            onClick={() => setDueOption('custom')}
          >
            {ru.today.actions.duePickDate}
          </Button>
        </div>
        {!todayAvailable ? (
          <p className="text-xs text-muted-foreground">{ru.today.todayUnavailable}</p>
        ) : null}
        {dueOption === 'custom' ? (
          <label htmlFor={customDateId} className="block space-y-1 text-sm">
            <span className="text-muted-foreground">{ru.today.actions.duePickDate}</span>
            <Input
              id={customDateId}
              type="date"
              value={customDate}
              min={getTaskDateInputMin()}
              disabled={submitting}
              onChange={(event) => {
                const nextDate = event.target.value
                setCustomDate(nextDate)
                submitReminder('custom', nextDate)
              }}
            />
          </label>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={submitting}
            onClick={() => {
              if (submitting) {
                return
              }

              onClosed(continuationIdentity)
            }}
          >
            {ru.today.actions.noReminder}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={submitting}
            onClick={() => {
              if (submitting) {
                return
              }

              resetBranchDueState()
              setPhase('choose')
            }}
          >
            {ru.common.back}
          </Button>
        </div>
        {actionError ? (
          <div className="space-y-2">
            <p className="text-sm text-destructive" role="alert">
              {actionError}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={submitting}
              onClick={() => {
                if (!dueOption) {
                  return
                }

                submitReminder(dueOption)
              }}
            >
              {ru.today.retry}
            </Button>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{ru.today.accepted}</p>
      <p className="text-sm">{decision.title}</p>
      <CreateTaskFromDecisionForm
        decisionId={decision.id}
        continuationIdentity={continuationIdentity}
        initialTitle={decision.title}
        onCancel={() => {
          setPhase('choose')
        }}
        onCreated={(task) => {
          if (!mountedRef.current) {
            return
          }

          setCreatedFrom('task')
          setCreatedTask(task)
          setPhase('created')
          onTaskCreatedRef.current?.()
        }}
      />
    </div>
  )
}
