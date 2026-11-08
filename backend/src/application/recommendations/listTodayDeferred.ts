import { RecommendationStatus } from '@prisma/client'
import { BusinessNotFoundError } from '../companies/listCompanies.js'
import {
  TODAY_DEFERRED_ITEM_LIMIT,
  type TodayDeferredCompanyDto,
  type TodayDeferredResponse,
  type TodayDeferredStatus,
} from '../../domain/recommendations/todayDeferredResponse.js'
import { findBusinessById } from '../../infrastructure/companies/companyRepository.js'
import {
  findTodayDeferredRecommendations,
  type TodayDeferredRow,
} from '../../infrastructure/recommendations/recommendationRepository.js'

function readStatus(status: RecommendationStatus): TodayDeferredStatus {
  if (status !== RecommendationStatus.NEW && status !== RecommendationStatus.VIEWED) {
    throw new Error('Today deferred status is invalid.')
  }

  return status
}

function toSnoozedUntil(value: Date): string {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new Error('Today deferred snoozedUntil is invalid.')
  }

  return value.toISOString()
}

function toCompany(row: TodayDeferredRow): TodayDeferredCompanyDto | null {
  if (!row.companyId || !row.companyName) {
    return null
  }

  return {
    id: row.companyId,
    name: row.companyName,
  }
}

export async function listTodayDeferred(
  businessId: string,
): Promise<TodayDeferredResponse> {
  const business = await findBusinessById(businessId)
  if (!business) {
    throw new BusinessNotFoundError()
  }

  const rows = await findTodayDeferredRecommendations(
    businessId,
    new Date(),
    TODAY_DEFERRED_ITEM_LIMIT,
  )

  return {
    items: rows.map((row) => ({
      id: row.id,
      title: row.title,
      status: readStatus(row.status),
      snoozedUntil: toSnoozedUntil(row.snoozedUntil),
      company: toCompany(row),
    })),
  }
}
