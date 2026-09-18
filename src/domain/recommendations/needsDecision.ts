export const RECOMMENDATION_PRIORITIES = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
] as const

export const RECOMMENDATION_STATUSES = [
  'NEW',
  'VIEWED',
  'ACCEPTED',
  'MODIFIED',
  'REJECTED',
  'EXPIRED',
] as const

export const KNOWLEDGE_TYPES = [
  'FACT',
  'OBSERVATION',
  'AI_INFERENCE',
  'USER_INFO',
] as const

export const KNOWLEDGE_VERIFICATION_STATUSES = [
  'VERIFIED',
  'NEEDS_VERIFICATION',
  'ASSUMPTION',
  'OUTDATED',
] as const

export const KNOWLEDGE_SOURCE_TYPES = [
  'USER',
  'WEBSITE',
  'SEARCH',
  'IMPORT',
  'INTERACTION',
  'SYSTEM',
  'OTHER',
] as const

export type RecommendationPriority = (typeof RECOMMENDATION_PRIORITIES)[number]
export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number]
export type KnowledgeType = (typeof KNOWLEDGE_TYPES)[number]
export type KnowledgeVerificationStatus =
  (typeof KNOWLEDGE_VERIFICATION_STATUSES)[number]
export type KnowledgeSourceType = (typeof KNOWLEDGE_SOURCE_TYPES)[number]

export type NeedsDecisionRecommendationCompany = {
  id: string
  name: string
}

export type NeedsDecisionRecommendationKnowledge = {
  id: string
  content: string
  type: KnowledgeType
  verificationStatus: KnowledgeVerificationStatus
  sourceType: KnowledgeSourceType | null
  sourceLabel: string | null
  sourceUrl: string | null
  obtainedAt: string | null
  lastCheckedAt: string | null
}

export type NeedsDecisionRecommendation = {
  id: string
  title: string
  description: string
  reason: string
  priority: RecommendationPriority
  status: RecommendationStatus
  snoozedUntil: string | null
  createdAt: string
  company: NeedsDecisionRecommendationCompany | null
  knowledge: NeedsDecisionRecommendationKnowledge[]
}

export type NeedsDecisionRecommendations = {
  recommendations: NeedsDecisionRecommendation[]
}

export class InvalidNeedsDecisionResponseError extends Error {
  constructor(message = 'Needs-decision response is malformed.') {
    super(message)
    this.name = 'InvalidNeedsDecisionResponseError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown): string {
  if (typeof value !== 'string') {
    throw new InvalidNeedsDecisionResponseError()
  }

  return value
}

function readNullableString(value: unknown): string | null {
  if (value === null) {
    return null
  }

  return readString(value)
}

function readAllowed<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T {
  if (typeof value !== 'string') {
    throw new InvalidNeedsDecisionResponseError()
  }

  for (const candidate of allowed) {
    if (candidate === value) {
      return candidate
    }
  }

  throw new InvalidNeedsDecisionResponseError()
}

function readNullableAllowed<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | null {
  if (value === null) {
    return null
  }

  return readAllowed(value, allowed)
}

function parseCompany(value: unknown): NeedsDecisionRecommendationCompany | null {
  if (value === null) {
    return null
  }

  if (!isRecord(value)) {
    throw new InvalidNeedsDecisionResponseError()
  }

  return {
    id: readString(value.id),
    name: readString(value.name),
  }
}

function parseKnowledge(
  value: unknown,
): NeedsDecisionRecommendationKnowledge {
  if (!isRecord(value)) {
    throw new InvalidNeedsDecisionResponseError()
  }

  return {
    id: readString(value.id),
    content: readString(value.content),
    type: readAllowed(value.type, KNOWLEDGE_TYPES),
    verificationStatus: readAllowed(
      value.verificationStatus,
      KNOWLEDGE_VERIFICATION_STATUSES,
    ),
    sourceType: readNullableAllowed(value.sourceType, KNOWLEDGE_SOURCE_TYPES),
    sourceLabel: readNullableString(value.sourceLabel),
    sourceUrl: readNullableString(value.sourceUrl),
    obtainedAt: readNullableString(value.obtainedAt),
    lastCheckedAt: readNullableString(value.lastCheckedAt),
  }
}

function parseRecommendation(value: unknown): NeedsDecisionRecommendation {
  if (!isRecord(value)) {
    throw new InvalidNeedsDecisionResponseError()
  }

  if (!Array.isArray(value.knowledge)) {
    throw new InvalidNeedsDecisionResponseError()
  }

  return {
    id: readString(value.id),
    title: readString(value.title),
    description: readString(value.description),
    reason: readString(value.reason),
    priority: readAllowed(value.priority, RECOMMENDATION_PRIORITIES),
    status: readAllowed(value.status, RECOMMENDATION_STATUSES),
    snoozedUntil: readNullableString(value.snoozedUntil),
    createdAt: readString(value.createdAt),
    company: parseCompany(value.company),
    knowledge: value.knowledge.map(parseKnowledge),
  }
}

export function parseNeedsDecisionRecommendations(
  value: unknown,
): NeedsDecisionRecommendations {
  if (!isRecord(value) || !Array.isArray(value.recommendations)) {
    throw new InvalidNeedsDecisionResponseError()
  }

  return {
    recommendations: value.recommendations.map(parseRecommendation),
  }
}
