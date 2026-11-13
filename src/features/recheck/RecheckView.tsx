import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type {
  KnowledgeRecheckItem,
  KnowledgeRecheckStatus,
  KnowledgeRecheckType,
} from '@/domain/knowledge/knowledgeRecheck'
import { useCurrentBusiness } from '@/features/business/CurrentBusinessContext'
import { useKnowledgeRecheck } from '@/features/recheck/useKnowledgeRecheck'
import {
  getKnowledgeSourceUrl,
  presentText,
} from '@/features/today/needsDecisionPresentation'
import { ru } from '@/i18n/ru'
import { formatDateTime } from '@/lib/utils'

const TYPE_BADGE_VARIANT = {
  FACT: 'outline',
  OBSERVATION: 'secondary',
  AI_INFERENCE: 'warning',
  USER_INFO: 'muted',
} as const

const STATUS_BADGE_VARIANT = {
  OUTDATED: 'destructive',
  NEEDS_VERIFICATION: 'warning',
} as const

function typeLabel(type: KnowledgeRecheckType): string {
  return ru.recheck.knowledgeType[type]
}

function statusLabel(status: KnowledgeRecheckStatus): string {
  return ru.recheck.verification[status]
}

function headingFor(item: KnowledgeRecheckItem): string {
  return item.company?.name ?? ru.recheck.withoutCompany
}

function sourceText(item: KnowledgeRecheckItem): string | null {
  const label = presentText(item.sourceLabel)
  if (label) {
    return label
  }

  if (presentText(item.sourceUrl)) {
    return ru.recheck.sourceFallback
  }

  return null
}

function dateText(item: KnowledgeRecheckItem): string | null {
  if (item.lastCheckedAt) {
    return ru.recheck.lastChecked.replace('{when}', formatDateTime(item.lastCheckedAt))
  }

  if (item.obtainedAt) {
    return ru.recheck.obtained.replace('{when}', formatDateTime(item.obtainedAt))
  }

  return null
}

export function RecheckView() {
  const { businessId } = useCurrentBusiness()
  const { data, isLoading, error, refetch } = useKnowledgeRecheck()
  const items = data?.items ?? []

  return (
    <section className="space-y-4" aria-busy={isLoading}>
      <RecheckViewBody
        businessId={businessId}
        items={items}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
      />
    </section>
  )
}

function RecheckViewBody({
  businessId,
  items,
  isLoading,
  error,
  onRetry,
}: {
  businessId: string | null
  items: KnowledgeRecheckItem[]
  isLoading: boolean
  error: Error | null
  onRetry: () => void
}) {
  if (businessId === null) {
    return <p className="text-sm text-muted-foreground">{ru.recheck.missingBusiness}</p>
  }

  if (isLoading && items.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{ru.common.loading}</p>
        <RecheckCardSkeleton />
      </div>
    )
  }

  if (error && items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 pt-6">
          <p className="text-sm text-muted-foreground" role="alert">
            {ru.recheck.loadError}
          </p>
          <Button type="button" variant="outline" onClick={onRetry}>
            {ru.recheck.retry}
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{ru.recheck.empty}</p>
  }

  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.knowledgeId}>
          <RecheckCard item={item} />
        </li>
      ))}
    </ul>
  )
}

function RecheckCard({ item }: { item: KnowledgeRecheckItem }) {
  const heading = headingFor(item)
  const source = sourceText(item)
  const safeSourceUrl = getKnowledgeSourceUrl(item)
  const date = dateText(item)

  return (
    <Card>
      <CardHeader className="space-y-3">
        <h2 className="text-base font-semibold leading-none tracking-tight">{heading}</h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant={STATUS_BADGE_VARIANT[item.verificationStatus]}>
            {statusLabel(item.verificationStatus)}
          </Badge>
          <Badge variant={TYPE_BADGE_VARIANT[item.type]}>{typeLabel(item.type)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="whitespace-pre-wrap break-words text-sm">{item.content}</p>
        {source ? <p className="text-sm text-muted-foreground">{source}</p> : null}
        {date ? <p className="text-sm text-muted-foreground">{date}</p> : null}
        {safeSourceUrl ? (
          <a
            href={safeSourceUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`${ru.recheck.openSource}: ${heading}`}
            className="inline-flex text-sm font-medium text-primary hover:underline"
          >
            {ru.recheck.openSource}
          </a>
        ) : null}
      </CardContent>
    </Card>
  )
}

function RecheckCardSkeleton() {
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
