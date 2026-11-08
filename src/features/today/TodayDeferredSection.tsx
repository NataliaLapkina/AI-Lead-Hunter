import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { TodayDeferredItem } from '@/domain/recommendations/todayDeferred'
import { useCurrentBusiness } from '@/features/business/CurrentBusinessContext'
import { useTodayDeferred } from '@/features/today/useTodayDeferred'
import { ru } from '@/i18n/ru'
import { formatDateTime } from '@/lib/utils'

export function TodayDeferredSection() {
  const { businessId } = useCurrentBusiness()
  const { data, isLoading, error, refetch } = useTodayDeferred()
  const items = data?.items ?? []

  return (
    <section className="space-y-4" aria-labelledby="deferred-heading" aria-busy={isLoading}>
      <h2 id="deferred-heading" className="text-lg font-semibold tracking-tight">
        {ru.today.deferred}
      </h2>
      <TodayDeferredSectionBody
        businessId={businessId}
        items={items}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
      />
    </section>
  )
}

function deferredHeading(item: TodayDeferredItem): string {
  return item.company?.name ?? item.title
}

function deferredUntilLabel(snoozedUntil: string): string {
  return ru.today.deferredUntil.replace('{when}', formatDateTime(snoozedUntil))
}

function TodayDeferredSectionBody({
  businessId,
  items,
  isLoading,
  error,
  onRetry,
}: {
  businessId: string | null
  items: TodayDeferredItem[]
  isLoading: boolean
  error: Error | null
  onRetry: () => void
}) {
  if (businessId === null) {
    return <p className="text-sm text-muted-foreground">{ru.today.missingBusiness}</p>
  }

  if (isLoading && items.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{ru.common.loading}</p>
        <DeferredCardSkeleton />
      </div>
    )
  }

  if (error && items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 pt-6">
          <p className="text-sm text-muted-foreground" role="alert">
            {ru.today.deferredLoadError}
          </p>
          <Button type="button" variant="outline" onClick={onRetry}>
            {ru.today.retry}
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{ru.today.emptyDeferred}</p>
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const heading = deferredHeading(item)
        return (
          <Card key={item.id}>
            <CardHeader className="space-y-1">
              <CardTitle className="text-base">{heading}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {heading !== item.title ? <p className="text-sm">{item.title}</p> : null}
              <p className="text-sm">{deferredUntilLabel(item.snoozedUntil)}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function DeferredCardSkeleton() {
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
