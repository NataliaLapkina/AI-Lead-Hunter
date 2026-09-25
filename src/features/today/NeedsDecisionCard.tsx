import { useId, useState } from 'react'
import { ChevronDown, ExternalLink } from 'lucide-react'
import type { NeedsDecisionRecommendation } from '@/domain/recommendations/needsDecision'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RecommendationActionBar } from '@/features/today/RecommendationActionBar'
import {
  getKnowledgeDisplayDate,
  getKnowledgeSourceLabel,
  getKnowledgeSourceUrl,
  getKnowledgeTypeLabel,
  getPriorityLabel,
  getVerificationLabel,
  hasWhyAiContent,
  presentText,
} from '@/features/today/needsDecisionPresentation'
import { ru } from '@/i18n/ru'
import { cn } from '@/lib/utils'

const PRIORITY_BADGE_VARIANT = {
  LOW: 'muted',
  MEDIUM: 'secondary',
  HIGH: 'warning',
  CRITICAL: 'destructive',
} as const

const TYPE_BADGE_VARIANT = {
  FACT: 'outline',
  OBSERVATION: 'secondary',
  AI_INFERENCE: 'warning',
  USER_INFO: 'muted',
} as const

const VERIFICATION_BADGE_VARIANT = {
  VERIFIED: 'success',
  NEEDS_VERIFICATION: 'warning',
  ASSUMPTION: 'muted',
  OUTDATED: 'outline',
} as const

interface NeedsDecisionCardProps {
  recommendation: NeedsDecisionRecommendation
  onActionSuccess: () => void
}

export function NeedsDecisionCard({
  recommendation,
  onActionSuccess,
}: NeedsDecisionCardProps) {
  const whyId = useId()
  const [isWhyOpen, setIsWhyOpen] = useState(false)
  const description = presentText(recommendation.description)
  const reason = presentText(recommendation.reason)
  const canExplain = hasWhyAiContent(recommendation.reason, recommendation.knowledge)

  return (
    <Card>
      <CardHeader className="gap-3 space-y-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            {recommendation.company ? (
              <p className="text-sm text-muted-foreground">{recommendation.company.name}</p>
            ) : null}
            <CardTitle className="text-base">{recommendation.title}</CardTitle>
          </div>
          <Badge variant={PRIORITY_BADGE_VARIANT[recommendation.priority]}>
            {getPriorityLabel(recommendation.priority)}
          </Badge>
        </div>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </CardHeader>
      {canExplain ? (
        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto px-0"
            aria-expanded={isWhyOpen}
            aria-controls={whyId}
            onClick={() => setIsWhyOpen((current) => !current)}
          >
            {ru.today.whyAiDecided}
            <ChevronDown
              className={cn('h-4 w-4 transition-transform', isWhyOpen && 'rotate-180')}
              aria-hidden
            />
          </Button>
          <div id={whyId} hidden={!isWhyOpen} className="space-y-4">
            {reason ? (
              <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {ru.today.aiRationale}
                </p>
                <p className="text-sm">{reason}</p>
              </div>
            ) : null}
            {recommendation.knowledge.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {ru.today.supportingKnowledge}
                </p>
                <ul className="space-y-3">
                  {recommendation.knowledge.map((item) => (
                    <KnowledgeItem key={item.id} knowledge={item} />
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </CardContent>
      ) : null}
      <CardContent className={canExplain ? 'pt-0' : undefined}>
        <RecommendationActionBar
          recommendationId={recommendation.id}
          onSuccess={onActionSuccess}
        />
      </CardContent>
    </Card>
  )
}

function KnowledgeItem({
  knowledge,
}: {
  knowledge: NeedsDecisionRecommendation['knowledge'][number]
}) {
  const sourceLabel = getKnowledgeSourceLabel(knowledge)
  const sourceUrl = getKnowledgeSourceUrl(knowledge)
  const displayDate = getKnowledgeDisplayDate(knowledge)

  return (
    <li className="space-y-2 rounded-lg border p-3">
      <p className="text-sm">{knowledge.content}</p>
      <div className="flex flex-wrap gap-2">
        <Badge variant={TYPE_BADGE_VARIANT[knowledge.type]}>
          {getKnowledgeTypeLabel(knowledge.type)}
        </Badge>
        <Badge variant={VERIFICATION_BADGE_VARIANT[knowledge.verificationStatus]}>
          {getVerificationLabel(knowledge.verificationStatus)}
        </Badge>
      </div>
      {sourceLabel || sourceUrl || displayDate ? (
        <div className="space-y-1 text-xs text-muted-foreground">
          {sourceLabel && !sourceUrl ? <p>{sourceLabel}</p> : null}
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-1 text-primary hover:underline"
            >
              <span className="truncate">{sourceLabel ?? sourceUrl}</span>
              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
            </a>
          ) : null}
          {displayDate ? <p>{displayDate}</p> : null}
        </div>
      ) : null}
    </li>
  )
}
