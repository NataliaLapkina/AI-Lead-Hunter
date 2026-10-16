import type { TodayTask } from '@/domain/tasks/todayTask'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ru } from '@/i18n/ru'
import { formatDateTime } from '@/lib/utils'

const PRIORITY_BADGE_VARIANT = {
  LOW: 'muted',
  MEDIUM: 'secondary',
  HIGH: 'warning',
} as const

export function TodayTaskCard({
  task,
  starting = false,
  startError = null,
  onStart,
}: {
  task: TodayTask
  starting?: boolean
  startError?: string | null
  onStart?: () => void
}) {
  const canStart = task.status === 'TODO' && !starting

  return (
    <Card className={task.isOverdue ? 'border-destructive/40' : undefined}>
      <CardHeader className="gap-3 space-y-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            {task.company ? (
              <p className="text-sm text-muted-foreground">{task.company.name}</p>
            ) : null}
            <CardTitle className="text-base">{task.title}</CardTitle>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{ru.today.taskStatus[task.status]}</Badge>
            <Badge variant={PRIORITY_BADGE_VARIANT[task.priority]}>
              {ru.today.priority[task.priority]}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{formatDateTime(task.dueAt)}</p>
        {task.isOverdue ? (
          <p className="text-sm text-destructive">{ru.today.overdue}</p>
        ) : null}
        {task.decision ? (
          <p className="text-sm text-muted-foreground">
            {`${ru.today.decisionLabel} ${task.decision.title}`}
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground">{ru.today.taskActions.unavailable}</p>
        {startError ? (
          <p className="text-sm text-destructive" role="alert">
            {startError}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canStart}
            aria-busy={starting}
            onClick={canStart ? onStart : undefined}
          >
            {starting ? ru.today.taskActions.starting : ru.today.taskActions.start}
          </Button>
          <Button type="button" variant="outline" size="sm" disabled>
            {ru.today.taskActions.reschedule}
          </Button>
          <Button type="button" variant="outline" size="sm" disabled>
            {ru.today.taskActions.complete}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
