import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { TodayAttentionItem } from '@/domain/tasks/todayAttention'
import { useCurrentBusiness } from '@/features/business/CurrentBusinessContext'
import { CreateTaskFromDecisionForm } from '@/features/today/CreateTaskFromDecisionForm'
import { useTodayAttention } from '@/features/today/useTodayAttention'
import { ru } from '@/i18n/ru'
import { formatDateTime } from '@/lib/utils'

const ATTENTION_TASK_IDENTITY = 1

export function TodayAttentionSection({
  onTasksRefetch,
  onRefetchReady,
}: {
  onTasksRefetch?: () => void
  onRefetchReady?: (refetch: () => void) => void
} = {}) {
  const { businessId } = useCurrentBusiness()
  const { data, isLoading, error, refetch } = useTodayAttention()
  const [creatingId, setCreatingId] = useState<string | null>(null)
  const items = data?.items ?? []

  useEffect(() => {
    onRefetchReady?.(refetch)
  }, [onRefetchReady, refetch])

  useEffect(() => {
    setCreatingId(null)
  }, [businessId])

  return (
    <section className="space-y-4" aria-labelledby="needs-attention-heading" aria-busy={isLoading}>
      <h2 id="needs-attention-heading" className="text-lg font-semibold tracking-tight">
        {ru.today.needsAttention}
      </h2>
      <TodayAttentionSectionBody
        businessId={businessId}
        items={items}
        isLoading={isLoading}
        error={error}
        creatingId={creatingId}
        onRetry={refetch}
        onCreate={setCreatingId}
        onCancelCreate={() => {
          setCreatingId(null)
        }}
        onCreated={() => {
          setCreatingId(null)
          refetch()
          onTasksRefetch?.()
        }}
      />
    </section>
  )
}

function attentionHeading(item: TodayAttentionItem): string {
  if (item.company) {
    return item.company.name
  }

  if (item.decision) {
    return item.decision.title
  }

  return item.title
}

function TodayAttentionSectionBody({
  businessId,
  items,
  isLoading,
  error,
  creatingId,
  onRetry,
  onCreate,
  onCancelCreate,
  onCreated,
}: {
  businessId: string | null
  items: TodayAttentionItem[]
  isLoading: boolean
  error: Error | null
  creatingId: string | null
  onRetry: () => void
  onCreate: (itemId: string) => void
  onCancelCreate: () => void
  onCreated: () => void
}) {
  if (businessId === null) {
    return <p className="text-sm text-muted-foreground">{ru.today.missingBusiness}</p>
  }

  if (isLoading && items.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{ru.common.loading}</p>
        <AttentionCardSkeleton />
      </div>
    )
  }

  if (error && items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 pt-6">
          <p className="text-sm text-muted-foreground" role="alert">
            {ru.today.attentionLoadError}
          </p>
          <Button type="button" variant="outline" onClick={onRetry}>
            {ru.today.retry}
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{ru.today.emptyNeedsAttention}</p>
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const heading = attentionHeading(item)
        const canCreate = item.decision?.status === 'ACTIVE'
        return (
          <Card key={item.id}>
            <CardHeader className="space-y-1">
              <CardTitle className="text-base">{heading}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {heading !== item.title ? <p className="text-sm">{item.title}</p> : null}
              <p className="text-sm">{ru.today.attentionFollowUp}</p>
              <p className="text-sm text-muted-foreground">{formatDateTime(item.completedAt)}</p>
              {canCreate && item.decision && creatingId === item.id ? (
                <CreateTaskFromDecisionForm
                  decisionId={item.decision.id}
                  continuationIdentity={ATTENTION_TASK_IDENTITY}
                  initialTitle={item.decision.title}
                  onCancel={onCancelCreate}
                  onCreated={onCreated}
                />
              ) : null}
              {canCreate && creatingId !== item.id ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    onCreate(item.id)
                  }}
                >
                  {ru.today.actions.createTask}
                </Button>
              ) : null}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function AttentionCardSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  )
}
