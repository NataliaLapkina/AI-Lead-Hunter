import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { CreatedTask, TaskPriority } from '@/domain/tasks/task'
import { getTaskDateInputMin, isTodayDueAtAvailable } from '@/domain/tasks/taskDueAt'
import {
  useCreateTaskFromDecision,
  type CreateTaskDueOption,
} from '@/features/today/useCreateTaskFromDecision'
import { ru } from '@/i18n/ru'

const PRIORITY_OPTIONS: Array<{ value: TaskPriority; label: string }> = [
  { value: 'LOW', label: ru.today.actions.priorityLow },
  { value: 'MEDIUM', label: ru.today.actions.priorityMedium },
  { value: 'HIGH', label: ru.today.actions.priorityHigh },
]

export function CreateTaskFromDecisionForm({
  decisionId,
  continuationIdentity,
  initialTitle,
  onCancel,
  onCreated,
}: {
  decisionId: string
  continuationIdentity: number
  initialTitle: string
  onCancel: () => void
  onCreated: (task: CreatedTask) => void
}) {
  const [title, setTitle] = useState(initialTitle)
  const [dueOption, setDueOption] = useState<CreateTaskDueOption | null>(null)
  const [customDate, setCustomDate] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM')
  const { submitting, actionError, submit, clearActionError } = useCreateTaskFromDecision(
    decisionId,
    continuationIdentity,
  )
  const titleId = useId()
  const customDateId = useId()
  const todayAvailable = isTodayDueAtAvailable()

  function submitForm(): void {
    void submit({
      title,
      dueOption,
      customDate,
      priority,
    }).then((result) => {
      if (result.status === 'success') {
        onCreated(result.task)
      }
    })
  }

  return (
    <div className="space-y-3">
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
        <div className="flex flex-wrap gap-2" role="group" aria-label={ru.today.taskWhen}>
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
        <div className="flex flex-wrap gap-2" role="group" aria-label={ru.today.taskPriorityLabel}>
          {PRIORITY_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={priority === option.value ? 'default' : 'secondary'}
              disabled={submitting}
              aria-pressed={priority === option.value}
              onClick={() => setPriority(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={submitting} onClick={submitForm}>
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
            onCancel()
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
          <Button type="button" size="sm" variant="outline" disabled={submitting} onClick={submitForm}>
            {ru.today.retry}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
