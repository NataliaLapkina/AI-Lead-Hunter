import type { KnowledgeRecheck } from '@/domain/knowledge/knowledgeRecheck'

export type KnowledgeRecheckQuerySnapshot = {
  dataBusinessId: string | null
  data: KnowledgeRecheck | null
  errorBusinessId: string | null
  error: Error | null
}

export type KnowledgeRecheckQueryView = {
  data: KnowledgeRecheck | null
  error: Error | null
  isLoading: boolean
}

export function createKnowledgeRecheckQuerySnapshot(): KnowledgeRecheckQuerySnapshot {
  return {
    dataBusinessId: null,
    data: null,
    errorBusinessId: null,
    error: null,
  }
}

export function beginKnowledgeRecheckQuery(): KnowledgeRecheckQuerySnapshot {
  return createKnowledgeRecheckQuerySnapshot()
}

export function succeedKnowledgeRecheckQuery(
  businessId: string,
  data: KnowledgeRecheck,
): KnowledgeRecheckQuerySnapshot {
  return {
    dataBusinessId: businessId,
    data,
    errorBusinessId: null,
    error: null,
  }
}

export function failKnowledgeRecheckQuery(
  businessId: string,
  error: Error,
): KnowledgeRecheckQuerySnapshot {
  return {
    dataBusinessId: null,
    data: null,
    errorBusinessId: businessId,
    error,
  }
}

export function selectKnowledgeRecheckQueryView(
  snapshot: KnowledgeRecheckQuerySnapshot,
  businessId: string | null,
): KnowledgeRecheckQueryView {
  if (businessId === null) {
    return {
      data: null,
      error: null,
      isLoading: false,
    }
  }

  const data = snapshot.dataBusinessId === businessId ? snapshot.data : null
  const error = snapshot.errorBusinessId === businessId ? snapshot.error : null

  return {
    data,
    error,
    isLoading: data === null && error === null,
  }
}
