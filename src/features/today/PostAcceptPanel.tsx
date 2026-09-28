import { useEffect, useId, useRef, useState } from 'react'
import type { AcceptedDecision } from '@/domain/decisions/decision'
import type { CreatedTask, TaskPriority } from '@/domain/tasks/task'
import { getTaskDateInputMin, isTodayDueAtAvailable } from '@/domain/tasks/taskDueAt'
import {
  useCreateTaskFromDecision,
  type CreateTaskAttempt,
  type CreateTaskDueOption,
} from '@/features/today/useCreateTaskFromDecision'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ru } from '@/i18n/ru'
import { formatDateTime } from '@/lib/utils'

const PRIORITY_OPTIONS: Array<{ value: TaskPriority; label: string }> = [
  { value: 'LOW', label: ru.today.actions.priorityLow },
  { value: 'MEDIUM', label: ru.today.actions.priorityMedium },
  { value: 'HIGH', label: ru.today.actions.priorityHigh },
]

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
  const [title, setTitle] = useState(decision.title)
  const [dueOption, setDueOption] = useState<CreateTaskDueOption | null>(null)
  const [customDate, setCustomDate] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM')
  const [createdTask, setCreatedTask] = useState<CreatedTask | null>(null)
  const [createdFrom, setCreatedFrom] = useState<'task' | 'reminder' | null>(null)
  const { submitting, actionError, submit, clearActionError } =
    useCreateTaskFromDecision(decision.id, continuationIdentity)
  const titleId = useId()
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
              setTitle(decision.title)
              setPriority('MEDIUM')
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
      <div className="space-y-1">
        <label htmlFor={titleId} className="text-sm text-muted-foreground">
          {ru.today.taskTitle}
        </label>
        <Textarea
          id={titleId}
          value={title}
          disabled={submitting}
          onChange={(event) => setTitle(event.target.value)}
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{ru.today.taskWhen}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={dueOption === 'today' ? 'default' : 'secondary'}
            disabled={submitting || !todayAvailable}
            onClick={() => setDueOption('today')}
          >
            {ru.today.actions.dueToday}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={dueOption === 'tomorrow' ? 'default' : 'secondary'}
            disabled={submitting}
            onClick={() => setDueOption('tomorrow')}
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
              onChange={(event) => setCustomDate(event.target.value)}
            />
          </label>
        ) : null}
      </div>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{ru.today.taskPriorityLabel}</p>
        <div className="flex flex-wrap gap-2">
          {PRIORITY_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={priority === option.value ? 'default' : 'secondary'}
              disabled={submitting}
              onClick={() => setPriority(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={submitting}
          onClick={() => {
            void submit({
              title,
              dueOption,
              customDate,
              priority,
            }).then((result) => handleTaskResult(result, 'task'))
          }}
        >
          {ru.today.actions.createTask}
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

            clearActionError()
            setPhase('choose')
          }}
        >
          {ru.common.cancel}
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
              void submit({
                title,
                dueOption,
                customDate,
                priority,
              }).then((result) => handleTaskResult(result, 'task'))
            }}
          >
            {ru.today.retry}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
