import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  TASK_COMPLETION_OUTCOMES,
  type TaskCompletionOutcome,
} from '@/domain/tasks/completeTask'
import type { TodayTask } from '@/domain/tasks/todayTask'
import { ru } from '@/i18n/ru'

export function CompleteTaskDialog({
  task,
  pending,
  error,
  onOpenChange,
  onSubmit,
}: {
  task: TodayTask | null
  pending: boolean
  error: string | null
  onOpenChange: (open: boolean) => void
  onSubmit: (outcome: TaskCompletionOutcome, comment: string) => void
}) {
  const open = task !== null

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && pending) {
      return
    }

    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} modal onOpenChange={handleOpenChange}>
      {task ? (
        <DialogContent
          className="pointer-events-auto max-h-[calc(100dvh-2rem)] overflow-y-auto"
          onEscapeKeyDown={(event) => {
            if (pending) {
              event.preventDefault()
            }
          }}
          onInteractOutside={(event) => {
            if (pending) {
              event.preventDefault()
            }
          }}
        >
          <CompleteTaskForm
            key={task.id}
            task={task}
            pending={pending}
            error={error}
            onCancel={() => {
              handleOpenChange(false)
            }}
            onSubmit={onSubmit}
          />
        </DialogContent>
      ) : null}
    </Dialog>
  )
}

function CompleteTaskForm({
  task,
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  task: TodayTask
  pending: boolean
  error: string | null
  onCancel: () => void
  onSubmit: (outcome: TaskCompletionOutcome, comment: string) => void
}) {
  const [outcome, setOutcome] = useState<TaskCompletionOutcome | null>(null)
  const [comment, setComment] = useState('')
  const commentRequired = outcome === 'OTHER' && comment.trim().length === 0
  const localMessage = commentRequired ? ru.today.complete.commentRequired : null
  const alertMessage = localMessage ?? error
  const canSubmit = outcome !== null && !commentRequired && !pending

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || !outcome || commentRequired) {
      return
    }

    onSubmit(outcome, comment)
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="grid min-w-0 gap-4">
      <DialogHeader>
        <DialogTitle>{ru.today.complete.title}</DialogTitle>
        <DialogDescription>{ru.today.complete.question}</DialogDescription>
      </DialogHeader>
      <p className="break-words text-base font-medium">{task.title}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={ru.today.complete.question}>
        {TASK_COMPLETION_OUTCOMES.map((option) => (
          <Button
            key={option}
            type="button"
            variant={outcome === option ? 'secondary' : 'outline'}
            size="sm"
            disabled={pending}
            aria-pressed={outcome === option}
            onClick={() => {
              if (pending) {
                return
              }

              setOutcome(option)
            }}
          >
            {ru.today.complete.outcomes[option]}
          </Button>
        ))}
      </div>
      <div className="min-w-0 space-y-2">
        <Label htmlFor={`complete-comment-${task.id}`}>{ru.today.complete.comment}</Label>
        <Textarea
          id={`complete-comment-${task.id}`}
          value={comment}
          disabled={pending}
          onChange={(event) => {
            if (pending) {
              return
            }

            setComment(event.target.value)
          }}
        />
      </div>
      {alertMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {alertMessage}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
          {ru.common.cancel}
        </Button>
        <Button type="submit" disabled={!canSubmit} aria-busy={pending}>
          {pending ? ru.today.complete.submitting : ru.today.taskActions.complete}
        </Button>
      </DialogFooter>
    </form>
  )
}
