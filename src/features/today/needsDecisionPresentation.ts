import type {
  KnowledgeSourceType,
  KnowledgeType,
  KnowledgeVerificationStatus,
  NeedsDecisionRecommendationKnowledge,
  RecommendationPriority,
} from '@/domain/recommendations/needsDecision'
import { ru } from '@/i18n/ru'
import { formatDate } from '@/lib/utils'

export function presentText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function getPriorityLabel(priority: RecommendationPriority): string {
  return ru.today.priority[priority]
}

export function getKnowledgeTypeLabel(type: KnowledgeType): string {
  return ru.today.knowledgeType[type]
}

export function getVerificationLabel(
  status: KnowledgeVerificationStatus,
): string {
  return ru.today.verification[status]
}

export function getSourceTypeLabel(sourceType: KnowledgeSourceType): string {
  return ru.today.sourceType[sourceType]
}

export function getKnowledgeSourceLabel(
  knowledge: Pick<NeedsDecisionRecommendationKnowledge, 'sourceLabel' | 'sourceType'>,
): string | null {
  const labeled = presentText(knowledge.sourceLabel)
  if (labeled) {
    return labeled
  }

  if (knowledge.sourceType) {
    return getSourceTypeLabel(knowledge.sourceType)
  }

  return null
}

export function getKnowledgeSourceUrl(
  knowledge: Pick<NeedsDecisionRecommendationKnowledge, 'sourceUrl'>,
): string | null {
  const trimmed = presentText(knowledge.sourceUrl)
  if (!trimmed) {
    return null
  }

  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return null
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return null
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null
  }

  return parsed.href
}

export function selectKnowledgeDate(
  knowledge: Pick<NeedsDecisionRecommendationKnowledge, 'lastCheckedAt' | 'obtainedAt'>,
): string | null {
  return presentText(knowledge.lastCheckedAt) ?? presentText(knowledge.obtainedAt)
}

export function getKnowledgeDisplayDate(
  knowledge: Pick<NeedsDecisionRecommendationKnowledge, 'lastCheckedAt' | 'obtainedAt'>,
): string | null {
  const iso = selectKnowledgeDate(knowledge)
  if (!iso) {
    return null
  }

  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return formatDate(parsed)
}

export function hasWhyAiContent(
  reason: string,
  knowledge: readonly unknown[],
): boolean {
  return presentText(reason) !== null || knowledge.length > 0
}
