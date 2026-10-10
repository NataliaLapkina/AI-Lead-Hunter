import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { MissingTimeZoneError } from '@/domain/tasks/browserTimeZone'
import type { TodayTask } from '@/domain/tasks/todayTask'
import { useCurrentBusiness } from '@/features/business/CurrentBusinessContext'
import { TodayTaskCard } from '@/features/today/TodayTaskCard'
import { useTodayTasks } from '@/features/today/useTodayTasks'
import { ru } from '@/i18n/ru'

export function TodayTasksSection() {
  const { businessId } = useCurrentBusiness()
  const { data, isLoading, error, refetch } = useTodayTasks()
  const tasks = data?.tasks ?? []

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
}: {
  businessId: string | null
  tasks: TodayTask[]
  isLoading: boolean
  error: Error | null
  onRetry: () => void
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
        <TodayTaskCard key={task.id} task={task} />
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
