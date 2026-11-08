import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { MissingTimeZoneError } from '@/domain/tasks/browserTimeZone'
import type { TodayTask } from '@/domain/tasks/todayTask'
import { useCurrentBusiness } from '@/features/business/CurrentBusinessContext'
import { CompleteTaskDialog } from '@/features/today/CompleteTaskDialog'
import { RescheduleTaskDialog } from '@/features/today/RescheduleTaskDialog'
import { TodayTaskCard } from '@/features/today/TodayTaskCard'
import { useCompleteTodayTask } from '@/features/today/useCompleteTodayTask'
import { useRescheduleTodayTask } from '@/features/today/useRescheduleTodayTask'
import { useStartTodayTask } from '@/features/today/useStartTodayTask'
import { useTodayTasks } from '@/features/today/useTodayTasks'
import { ru } from '@/i18n/ru'

export function TodayTasksSection({
  onRefetchReady,
}: {
  onRefetchReady?: (refetch: () => void) => void
} = {}) {
  const { businessId } = useCurrentBusiness()
  const { data, isLoading, error, refetch } = useTodayTasks()

  useEffect(() => {
    onRefetchReady?.(refetch)
  }, [onRefetchReady, refetch])
  const start = useStartTodayTask(businessId, refetch)
  const reschedule = useRescheduleTodayTask(businessId, refetch)
  const complete = useCompleteTodayTask(businessId, refetch)
  const tasks = data?.tasks ?? []
  const [rescheduleTask, setRescheduleTask] = useState<TodayTask | null>(null)
  const [completeTask, setCompleteTask] = useState<TodayTask | null>(null)

  useEffect(() => {
    setRescheduleTask(null)
    setCompleteTask(null)
  }, [businessId])

  function openReschedule(taskId: string) {
    if (reschedule.pending) {
      return
    }

    const task = tasks.find((item) => item.id === taskId)
    if (!task || (task.status !== 'TODO' && task.status !== 'IN_PROGRESS')) {
      return
    }

    reschedule.clearError()
    setRescheduleTask(task)
  }

  function openComplete(taskId: string) {
    if (complete.pending) {
      return
    }

    const task = tasks.find((item) => item.id === taskId)
    if (!task || (task.status !== 'TODO' && task.status !== 'IN_PROGRESS')) {
      return
    }

    complete.clearError()
    setCompleteTask(task)
  }

  return (
    <section className="space-y-4" aria-labelledby="needs-to-do-heading" aria-busy={isLoading}>
      <h2 id="needs-to-do-heading" className="text-lg font-semibold tracking-tight">
        {ru.today.needsToDo}
      </h2>
      <TodayTasksSectionBody
        businessId={businessId}
        tasks={tasks}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        isStarting={start.isPending}
        startErrorFor={start.errorFor}
        onStart={start.start}
        onReschedule={openReschedule}
        onComplete={openComplete}
      />
      <RescheduleTaskDialog
        task={rescheduleTask}
        pending={reschedule.pending}
        error={reschedule.error}
        onOpenChange={(nextOpen) => {
          if (nextOpen || reschedule.pending) {
            return
          }

          reschedule.clearError()
          setRescheduleTask(null)
        }}
        onSubmit={(dueAt) => {
          if (!rescheduleTask) {
            return
          }

          reschedule.reschedule(rescheduleTask.id, dueAt, () => {
            setRescheduleTask(null)
          })
        }}
      />
      <CompleteTaskDialog
        task={completeTask}
        pending={complete.pending}
        error={complete.error}
        onOpenChange={(nextOpen) => {
          if (nextOpen || complete.pending) {
            return
          }

          complete.clearError()
          setCompleteTask(null)
        }}
        onSubmit={(outcome, comment) => {
          if (!completeTask) {
            return
          }

          complete.complete(completeTask.id, outcome, comment, () => {
            setCompleteTask(null)
          })
        }}
      />
    </section>
  )
}

function TodayTasksSectionBody({
  businessId,
  tasks,
  isLoading,
  error,
  onRetry,
  isStarting,
  startErrorFor,
  onStart,
  onReschedule,
  onComplete,
}: {
  businessId: string | null
  tasks: TodayTask[]
  isLoading: boolean
  error: Error | null
  onRetry: () => void
  isStarting: (taskId: string) => boolean
  startErrorFor: (taskId: string) => string | null
  onStart: (taskId: string) => void
  onReschedule: (taskId: string) => void
  onComplete: (taskId: string) => void
}) {
  if (businessId === null) {
    return <p className="text-sm text-muted-foreground">{ru.today.missingBusiness}</p>
  }

  if (isLoading && tasks.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{ru.common.loading}</p>
        <TodayTaskCardSkeleton />
        <TodayTaskCardSkeleton />
        <TodayTaskCardSkeleton />
      </div>
    )
  }

  if (error && tasks.length === 0) {
    const message =
      error instanceof MissingTimeZoneError
        ? ru.today.missingTimeZone
        : ru.today.tasksLoadError

    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 pt-6">
          <p className="text-sm text-muted-foreground">{message}</p>
          <Button type="button" variant="outline" onClick={onRetry}>
            {ru.today.retry}
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground">{ru.today.emptyNeedsToDo}</p>
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <TodayTaskCard
          key={task.id}
          task={task}
          starting={isStarting(task.id)}
          startError={startErrorFor(task.id)}
          onStart={() => {
            onStart(task.id)
          }}
          onReschedule={onReschedule}
          onComplete={onComplete}
        />
      ))}
    </div>
  )
}

function TodayTaskCardSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-8 w-48" />
      </CardContent>
    </Card>
  )
}
