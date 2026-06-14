import type { LeadSource } from '@/domain/lead'
import { LEAD_SOURCES } from '@/lib/constants'

/** Старые значения → новые (миграция и импорт) */
export const LEGACY_LEAD_SOURCE_MAP: Record<string, LeadSource> = {
  manual: 'other',
  search: 'other',
  referral: 'other',
  social: 'vk',
  linkedin: 'other',
  'вручную': 'other',
  'поиск': 'other',
  'рекомендация': 'other',
  'соцсети': 'vk',
  'авито': 'avito',
  'яндекс карты': 'yandex_maps',
  '2гис': '2gis',
  'сайт компании': 'company_site',
  'другое': 'other',
}

export function isLeadSource(value: string): value is LeadSource {
  return (LEAD_SOURCES as readonly string[]).includes(value)
}

export function resolveLeadSource(value: unknown, fallback: LeadSource = 'other'): LeadSource {
  if (typeof value !== 'string' || !value.trim()) return fallback

  const trimmed = value.trim()
  if (isLeadSource(trimmed)) return trimmed

  const lower = trimmed.toLowerCase()
  if (isLeadSource(lower)) return lower

  const mapped = LEGACY_LEAD_SOURCE_MAP[lower]
  if (mapped) return mapped

  return fallback
}
