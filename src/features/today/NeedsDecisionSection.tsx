import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentBusiness } from '@/features/business/CurrentBusinessContext'
import { NeedsDecisionCard } from '@/features/today/NeedsDecisionCard'
import { useNeedsDecisionRecommendations } from '@/features/today/useNeedsDecisionRecommendations'
import { ru } from '@/i18n/ru'

export function NeedsDecisionSection() {
  const { businessId } = useCurrentBusiness()
  const { data, isLoading, error, refetch } = useNeedsDecisionRecommendations()

  return (
    <section
      className="space-y-4"
      aria-labelledby="needs-decision-heading"
      aria-busy={isLoading}
    >
      <h2 id="needs-decision-heading" className="text-lg font-semibold tracking-tight">
        {ru.today.needsDecision}
      </h2>
      <NeedsDecisionSectionBody
        businessId={businessId}
        data={data}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
      />
    </section>
  )
}

function NeedsDecisionSectionBody({
  businessId,
  data,
  isLoading,
  error,
  onRetry,
}: {
  businessId: string | null
  data: ReturnType<typeof useNeedsDecisionRecommendations>['data']
  isLoading: boolean
  error: Error | null
  onRetry: () => void
}) {
  if (businessId === null) {
    return (
      <p className="text-sm text-muted-foreground">{ru.today.missingBusiness}</p>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{ru.common.loading}</p>
        <NeedsDecisionCardSkeleton />
        <NeedsDecisionCardSkeleton />
        <NeedsDecisionCardSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 pt-6">
          <p className="text-sm text-muted-foreground">{ru.today.loadError}</p>
          <Button type="button" variant="outline" onClick={onRetry}>
            {ru.today.retry}
          </Button>
        </CardContent>
      </Card>
    )
  }

  const recommendations = data?.recommendations ?? []
  if (recommendations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{ru.today.emptyNeedsDecision}</p>
    )
  }

  return (
    <div className="space-y-4">
      {recommendations.map((recommendation) => (
        <NeedsDecisionCard key={recommendation.id} recommendation={recommendation} />
      ))}
    </div>
  )
}

function NeedsDecisionCardSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  )
}
