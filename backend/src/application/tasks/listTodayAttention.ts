import {
  TODAY_ATTENTION_ITEM_LIMIT,
  type TodayAttentionCompanyDto,
  type TodayAttentionDecisionDto,
  type TodayAttentionResponse,
} from '../../domain/tasks/todayAttentionResponse.js'
import { findBusinessById } from '../../infrastructure/companies/companyRepository.js'
import {
  findTodayAttentionItems,
  type TodayAttentionRow,
} from '../../infrastructure/tasks/taskRepository.js'

export class BusinessNotFoundError extends Error {
  constructor() {
    super('Business not found.')
    this.name = 'BusinessNotFoundError'
  }
}

function toCompany(row: TodayAttentionRow): TodayAttentionCompanyDto | null {
  if (!row.companyId || !row.companyName) {
    return null
  }

  return {
    id: row.companyId,
    name: row.companyName,
  }
}

function toDecision(row: TodayAttentionRow): TodayAttentionDecisionDto | null {
  if (!row.decisionId || !row.decisionTitle || !row.decisionStatus) {
    return null
  }

  return {
    id: row.decisionId,
    title: row.decisionTitle,
    status: row.decisionStatus,
  }
}

function toCompletedAt(value: Date): string {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new Error('Today attention completedAt is invalid.')
  }

  return value.toISOString()
}

export async function listTodayAttention(
  businessId: string,
): Promise<TodayAttentionResponse> {
  const business = await findBusinessById(businessId)
  if (!business) {
    throw new BusinessNotFoundError()
  }

  const rows = await findTodayAttentionItems(
    businessId,
    TODAY_ATTENTION_ITEM_LIMIT,
  )

  return {
    items: rows.map((row) => ({
      id: row.id,
      completedAt: toCompletedAt(row.completedAt),
      completionOutcome: 'FOLLOW_UP',
      title: row.title,
      company: toCompany(row),
      decision: toDecision(row),
    })),
  }
}
