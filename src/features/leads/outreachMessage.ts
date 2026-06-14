import type { ImprovementOpportunity, Lead, AppProfile } from '@/domain/lead'
import { ru } from '@/i18n/ru'
import { getNicheOutreachRecommendations } from '@/features/leads/nicheOutreachRecommendations'
import { sanitizeLeadName } from '@/lib/leadLinks'
import {
  DEFAULT_SENDER_PROFILE,
  OUTREACH_SENDER,
  applyMessageSignature,
  buildMessageSignature,
  getSenderDisplayName,
  getSenderProfile,
  type SenderProfile,
} from '@/lib/senderProfile'

export { OUTREACH_SENDER, getSenderProfile, buildMessageSignature, getSenderDisplayName }
export { sanitizeLeadName } from '@/lib/leadLinks'
export type { SenderProfile }

export function safeLeadName(lead: Lead): string | null {
  return sanitizeLeadName(lead.name, lead)
}

export function getSafeLeadIntro(lead: Lead): string {
  const name = safeLeadName(lead)
  if (name) {
    return `Изучила вашу компанию «${name}» и заметила несколько точек роста:`
  }
  return 'Изучила вашу компанию и заметила несколько точек роста:'
}

/** @deprecated Используйте getSafeLeadIntro */
export function formatOutreachCompanyPhrase(lead: Lead): string {
  return getSafeLeadIntro(lead)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function scrubTechnicalLeadNamesFromMessage(message: string, lead: Lead): string {
  let result = message
  const rawName = lead.name?.trim()

  if (rawName && !sanitizeLeadName(rawName, lead)) {
    result = result.replace(new RegExp(`«\\s*${escapeRegExp(rawName)}\\s*»`, 'gi'), '')
    result = result.replace(new RegExp(escapeRegExp(rawName), 'gi'), '')
  }

  result = result.replace(/«\s*Item\s+\d+\s*»/gi, '')
  result = result.replace(/\bItem\s+\d+\b/gi, '')
  result = result.replace(/\b(undefined|null)\b/gi, '')
  result = result.replace(/Изучила вашу компанию\s+и заметила/g, 'Изучила вашу компанию и заметила')
  result = result.replace(/Изучила вашу компанию\s*«\s*»\s*и заметила/g, 'Изучила вашу компанию и заметила')
  result = result.replace(/\n{3,}/g, '\n\n')

  return result.trimEnd()
}

export function finalizeOutreachMessage(
  message: string,
  lead: Lead,
  senderProfile?: Partial<AppProfile>,
): string {
  return applyMessageSignature(scrubTechnicalLeadNamesFromMessage(message, lead), senderProfile)
}

function getOpportunityPitch(key: ImprovementOpportunity): string {
  return ru.opportunityPitches[key]
}

function collectAuditBullets(lead: Lead): string[] {
  return (
    lead.siteAudit?.findings
      ?.filter((f) => f.detected)
      .map((f) => {
        const text = f.details.trim()
        if (!text) return ''
        return text.charAt(0).toLowerCase() + text.slice(1)
      })
      .filter(Boolean) ?? []
  )
}

export function collectOutreachBullets(lead: Lead): string[] {
  const fromOpportunities = (lead.opportunities ?? []).map((key) => getOpportunityPitch(key))
  if (fromOpportunities.length > 0) {
    return fromOpportunities.slice(0, 4)
  }

  const fromAudit = collectAuditBullets(lead)
  if (fromAudit.length > 0) {
    return fromAudit.slice(0, 4)
  }

  if (!lead.website?.trim()) {
    return ['нет сайта — клиенты не находят вас в поиске', ...getNicheOutreachRecommendations(lead.niche).slice(0, 2)]
  }

  return getNicheOutreachRecommendations(lead.niche).slice(0, 4)
}

export function buildOutreachMessage(
  lead: Lead,
  senderProfile?: Partial<AppProfile>,
): string {
  const sender = getSenderProfile(senderProfile)
  const bullets = collectOutreachBullets(lead)
  const bulletBlock = bullets.map((b) => `• ${b}`).join('\n')
  const companyPhrase = getSafeLeadIntro(lead)
  const displayName = getSenderDisplayName(sender) || getSenderDisplayName(DEFAULT_SENDER_PROFILE)
  const specialization = sender.specialization.trim() || DEFAULT_SENDER_PROFILE.specialization

  const body = `Здравствуйте!
Меня зовут ${displayName}.
Я занимаюсь ${specialization}.
${companyPhrase}
${bulletBlock}
Эти моменты могут снижать количество обращений и доверие клиентов.
Могу показать конкретные варианты улучшений и примеры решений.
Если интересно — подготовлю краткий аудит без обязательств.`

  return finalizeOutreachMessage(body, lead, senderProfile)
}
