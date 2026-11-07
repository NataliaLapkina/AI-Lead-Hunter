import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { RescheduleDueAtFailureReason, RescheduleDueAtResult } from '@/domain/tasks/rescheduleDueAt'
import {
  defaultManualDateInput,
  defaultManualTimeInput,
  inThreeDaysAtTenDueAt,
  isLaterTodayAvailable,
  laterTodayDueAt,
  parseManualLocalDateTime,
  tomorrowAtTenDueAt,
} from '@/domain/tasks/rescheduleDueAt'
import type { TodayTask } from '@/domain/tasks/todayTask'
import { ru } from '@/i18n/ru'
import { formatDateTime } from '@/lib/utils'

type RescheduleChoice = 'laterToday' | 'tomorrow' | 'inThreeDays' | 'manual'

const QUICK_OPTIONS = [
  { id: 'laterToday', label: ru.today.reschedule.laterToday },
  { id: 'tomorrow', label: ru.today.reschedule.tomorrow },
  { id: 'inThreeDays', label: ru.today.reschedule.inThreeDays },
  { id: 'manual', label: ru.today.reschedule.pickDate },
] as const

function resolveSelection(
  choice: RescheduleChoice,
  dateInput: string,
  timeInput: string,
  now: Date,
): RescheduleDueAtResult {
  if (choice === 'laterToday') {
    return laterTodayDueAt(now)
  }

  if (choice === 'tomorrow') {
    return tomorrowAtTenDueAt(now)
  }

  if (choice === 'inThreeDays') {
    return inThreeDaysAtTenDueAt(now)
  }

  return parseManualLocalDateTime(dateInput, timeInput, now)
}

function validationMessage(reason: RescheduleDueAtFailureReason): string {
  if (reason === 'not-in-future') {
    return ru.today.reschedule.notInFuture
  }

  if (reason === 'unavailable') {
    return ru.today.reschedule.laterTodayUnavailable
  }

  return ru.today.reschedule.invalidLocalTime
}

export function RescheduleTaskDialog({
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
  onSubmit: (dueAt: string) => void
}) {
  const [choice, setChoice] = useState<RescheduleChoice | null>(null)
  const [dateInput, setDateInput] = useState('')
  const [timeInput, setTimeInput] = useState(defaultManualTimeInput)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!task) {
      return
    }

    const openedAt = new Date()
    setChoice(null)
    setDateInput(defaultManualDateInput(openedAt))
    setTimeInput(defaultManualTimeInput())
    setNow(openedAt)
  }, [task])

  const open = task !== null
  const laterTodayAvailable = isLaterTodayAvailable(now)
  const resolution = choice ? resolveSelection(choice, dateInput, timeInput, now) : null
  const localMessage = resolution && !resolution.ok ? validationMessage(resolution.reason) : null
  const alertMessage = localMessage ?? error
  const canSubmit = resolution?.ok === true && !pending

  function selectChoice(next: RescheduleChoice) {
    if (pending) {
      return
    }

    if (next === 'laterToday' && !isLaterTodayAvailable(new Date())) {
      return
    }

    setNow(new Date())
    setChoice(next)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && pending) {
      return
    }

    onOpenChange(nextOpen)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || !choice) {
      return
    }

    const freshNow = new Date()
    const fresh = resolveSelection(choice, dateInput, timeInput, freshNow)
    if (!fresh.ok) {
      setNow(freshNow)
      return
    }

    onSubmit(fresh.dueAt)
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
          <form noValidate onSubmit={handleSubmit} className="grid min-w-0 gap-4">
            <DialogHeader>
              <DialogTitle>{ru.today.reschedule.title}</DialogTitle>
              <DialogDescription className="break-words text-base font-medium text-foreground">
                {task.title}
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">{formatDateTime(task.dueAt)}</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_OPTIONS.map((option) => {
                const unavailable = option.id === 'laterToday' && !laterTodayAvailable
                return (
                  <Button
                    key={option.id}
                    type="button"
                    variant={choice === option.id ? 'secondary' : 'outline'}
                    size="sm"
                    disabled={pending || unavailable}
                    aria-pressed={choice === option.id}
                    onClick={() => {
                      selectChoice(option.id)
                    }}
                  >
                    {option.label}
                  </Button>
                )
              })}
            </div>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <Label htmlFor="reschedule-due-date">{ru.today.reschedule.date}</Label>
                <Input
                  id="reschedule-due-date"
                  type="date"
                  className="min-w-0"
                  value={dateInput}
                  disabled={pending}
                  onChange={(event) => {
                    if (pending) {
                      return
                    }

                    setNow(new Date())
                    setDateInput(event.target.value)
                    setChoice('manual')
                  }}
                />
              </div>
              <div className="min-w-0 space-y-2">
                <Label htmlFor="reschedule-due-time">{ru.today.reschedule.time}</Label>
                <Input
                  id="reschedule-due-time"
                  type="time"
                  className="min-w-0"
                  value={timeInput}
                  disabled={pending}
                  onChange={(event) => {
                    if (pending) {
                      return
                    }

                    setNow(new Date())
                    setTimeInput(event.target.value)
                    setChoice('manual')
                  }}
                />
              </div>
            </div>
            {resolution?.ok ? (
              <p className="text-sm">{`${ru.today.reschedule.newDue} ${formatDateTime(resolution.dueAt)}`}</p>
            ) : null}
            {alertMessage ? (
              <p className="text-sm text-destructive" role="alert">
                {alertMessage}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  handleOpenChange(false)
                }}
              >
                {ru.common.cancel}
              </Button>
              <Button type="submit" disabled={!canSubmit} aria-busy={pending}>
                {pending ? ru.today.reschedule.submitting : ru.today.taskActions.reschedule}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      ) : null}
    </Dialog>
  )
}
