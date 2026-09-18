import type { NeedsDecisionRecommendations } from '@/domain/recommendations/needsDecision'

export type NeedsDecisionQuerySnapshot = {
  dataBusinessId: string | null
  data: NeedsDecisionRecommendations | null
  errorBusinessId: string | null
  error: Error | null
}

export type NeedsDecisionQueryView = {
  data: NeedsDecisionRecommendations | null
  error: Error | null
  isLoading: boolean
}

export function createNeedsDecisionQuerySnapshot(): NeedsDecisionQuerySnapshot {
  return {
    dataBusinessId: null,
    data: null,
    errorBusinessId: null,
    error: null,
  }
}

export function beginNeedsDecisionQuery(): NeedsDecisionQuerySnapshot {
  return createNeedsDecisionQuerySnapshot()
}

export function succeedNeedsDecisionQuery(
  businessId: string,
  data: NeedsDecisionRecommendations,
): NeedsDecisionQuerySnapshot {
  return {
    dataBusinessId: businessId,
    data,
    errorBusinessId: null,
    error: null,
  }
}

export function failNeedsDecisionQuery(
  businessId: string,
  error: Error,
): NeedsDecisionQuerySnapshot {
  return {
    dataBusinessId: null,
    data: null,
    errorBusinessId: businessId,
    error,
  }
}

export function selectNeedsDecisionQueryView(
  snapshot: NeedsDecisionQuerySnapshot,
  businessId: string | null,
): NeedsDecisionQueryView {
  if (businessId === null) {
    return {
      data: null,
      error: null,
      isLoading: false,
    }
  }

  const data =
    snapshot.dataBusinessId === businessId ? snapshot.data : null
  const error =
    snapshot.errorBusinessId === businessId ? snapshot.error : null

  return {
    data,
    error,
    isLoading: data === null && error === null,
  }
}
