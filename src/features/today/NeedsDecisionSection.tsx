import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { AcceptedDecision } from '@/domain/decisions/decision'
import type { NeedsDecisionRecommendation } from '@/domain/recommendations/needsDecision'
import { useCurrentBusiness } from '@/features/business/CurrentBusinessContext'
import { NeedsDecisionCard } from '@/features/today/NeedsDecisionCard'
import { useNeedsDecisionRecommendations } from '@/features/today/useNeedsDecisionRecommendations'
import {
  usePostAcceptContinuations,
  type PostAcceptContinuation,
} from '@/features/today/usePostAcceptContinuation'
import { ru } from '@/i18n/ru'

export function NeedsDecisionSection() {
  const { businessId } = useCurrentBusiness()
  const { data, isLoading, error, refetch } = useNeedsDecisionRecommendations()
  const { continuations, add, remove } = usePostAcceptContinuations(businessId)

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
        continuations={continuations}
        onRetry={refetch}
        onActionSuccess={refetch}
        onAccepted={(input) => {
          const recommendation = data?.recommendations.find(
            (item) => item.id === input.recommendationId,
          )
          if (!recommendation) {
            return
          }

          add({
            recommendationId: input.recommendationId,
            businessId: input.businessId,
            decision: input.decision,
            recommendation,
          })
        }}
        onCloseContinuation={remove}
      />
    </section>
  )
}

function mergeVisibleCards(
  recommendations: NeedsDecisionRecommendation[],
  continuations: PostAcceptContinuation[],
): Array<{
  recommendation: NeedsDecisionRecommendation
  continuation: PostAcceptContinuation | null
}> {
  const continuationById = new Map(
    continuations.map((item) => [item.recommendationId, item]),
  )
  const listedIds = new Set(recommendations.map((item) => item.id))

  return [
    ...recommendations.map((recommendation) => ({
      recommendation,
      continuation: continuationById.get(recommendation.id) ?? null,
    })),
    ...continuations
      .filter((item) => !listedIds.has(item.recommendationId))
      .map((item) => ({
        recommendation: item.recommendation,
        continuation: item,
      })),
  ]
}

function NeedsDecisionSectionBody({
  businessId,
  data,
  isLoading,
  error,
  continuations,
  onRetry,
  onActionSuccess,
  onAccepted,
  onCloseContinuation,
}: {
  businessId: string | null
  data: ReturnType<typeof useNeedsDecisionRecommendations>['data']
  isLoading: boolean
  error: Error | null
  continuations: PostAcceptContinuation[]
  onRetry: () => void
  onActionSuccess: () => void
  onAccepted: (input: {
    businessId: string
    recommendationId: string
    decision: AcceptedDecision
  }) => void
  onCloseContinuation: (recommendationId: string, identity: number) => void
}) {
  if (businessId === null) {
    return (
      <p className="text-sm text-muted-foreground">{ru.today.missingBusiness}</p>
    )
  }

  const cards = mergeVisibleCards(data?.recommendations ?? [], continuations)

  if (isLoading && cards.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{ru.common.loading}</p>
        <NeedsDecisionCardSkeleton />
        <NeedsDecisionCardSkeleton />
        <NeedsDecisionCardSkeleton />
      </div>
    )
  }

  if (error && cards.length === 0) {
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

  if (cards.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{ru.today.emptyNeedsDecision}</p>
    )
  }

  return (
    <div className="space-y-4">
      {cards.map(({ recommendation, continuation }) => (
        <NeedsDecisionCard
          key={`${recommendation.id}:${continuation?.identity ?? 'recommendation'}`}
          recommendation={recommendation}
          continuation={continuation}
          onAccepted={onAccepted}
          onActionSuccess={onActionSuccess}
          onCloseContinuation={
            continuation
              ? (identity) => onCloseContinuation(recommendation.id, identity)
              : undefined
          }
        />
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
