import type { Lead, LeadPotentialFilter, LeadPotentialLevel } from '@/domain/lead'

export type { LeadPotentialFilter, LeadPotentialLevel }

export interface LeadScoreResult {
  score: number
  level: LeadPotentialLevel
  reasons: string[]
}

const MAX_LEAD_SCORE = 10

function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, '')
}

export function hasLeadPhone(lead: Lead): boolean {
  return phoneDigits(lead.contacts.phone ?? '').length >= 10
}

export function hasLeadWhatsApp(lead: Lead): boolean {
  const phone = lead.contacts.phone?.trim() ?? ''
  if (!phone) return false
  const lower = phone.toLowerCase()
  if (lower.includes('wa.me') || lower.includes('whatsapp')) return true
  return phoneDigits(phone).length >= 10
}

export function hasLeadTelegram(lead: Lead): boolean {
  return Boolean(lead.contacts.telegram?.trim())
}

export function hasLeadVk(lead: Lead): boolean {
  return Boolean(lead.contacts.vk?.trim())
}

export function hasLeadEmail(lead: Lead): boolean {
  return Boolean(lead.contacts.email?.trim())
}

export function hasLeadWebsiteOrSource(lead: Lead): boolean {
  return Boolean(lead.website?.trim() || lead.sourceUrl?.trim())
}

export function getLeadPotentialLevel(score: number): LeadPotentialLevel {
  if (score <= 3) return 'low'
  if (score <= 6) return 'medium'
  return 'high'
}

export function computeLeadScore(lead: Lead): LeadScoreResult {
  let score = 0
  const reasons: string[] = []
  const opportunities = lead.opportunities ?? []

  if (!lead.website?.trim()) {
    score += 2
    reasons.push('нет сайта')
  }

  if (opportunities.includes('no_booking_form')) {
    score += 2
    reasons.push('нет формы заявки')
  }

  if (opportunities.includes('no_online_booking')) {
    score += 2
    reasons.push('нет онлайн-записи')
  }

  if (hasLeadPhone(lead)) {
    score += 1
    reasons.push('есть телефон')
  }

  if (hasLeadWhatsApp(lead)) {
    score += 1
    reasons.push('есть WhatsApp')
  }

  if (hasLeadTelegram(lead)) {
    score += 1
    reasons.push('есть Telegram')
  }

  if (hasLeadVk(lead)) {
    score += 1
    reasons.push('есть VK')
  }

  if (hasLeadEmail(lead)) {
    score += 1
    reasons.push('есть Email')
  }

  if (hasLeadWebsiteOrSource(lead)) {
    score += 1
    reasons.push('есть сайт/источник')
  }

  if (opportunities.length >= 2) {
    score += 1
    reasons.push('есть несколько точек роста')
  }

  const cappedScore = Math.min(score, MAX_LEAD_SCORE)

  return {
    score: cappedScore,
    level: getLeadPotentialLevel(cappedScore),
    reasons,
  }
}

export function matchesPotentialFilter(
  lead: Lead,
  filter: LeadPotentialFilter,
): boolean {
  if (filter === 'all') return true
  return computeLeadScore(lead).level === filter
}
