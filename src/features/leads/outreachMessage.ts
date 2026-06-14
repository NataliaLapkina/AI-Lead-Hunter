import type { ImprovementOpportunity, Lead } from '@/domain/lead'
import { ru } from '@/i18n/ru'
import { getNicheOutreachRecommendations } from '@/features/leads/nicheOutreachRecommendations'
import { resolveLeadNameForOutreach } from '@/lib/leadLinks'
import {
  DEFAULT_SENDER_PROFILE,
  OUTREACH_SENDER,
  buildMessageSignature,
  getSenderDisplayName,
  getSenderProfile,
  type SenderProfile,
} from '@/lib/senderProfile'
import type { AppProfile } from '@/domain/lead'

export { OUTREACH_SENDER, getSenderProfile, buildMessageSignature, getSenderDisplayName }
export { resolveLeadNameForOutreach } from '@/lib/leadLinks'
export type { SenderProfile }

export function formatOutreachCompanyPhrase(lead: Lead): string {
  const name = resolveLeadNameForOutreach(lead)
  if (name) {
    return `Изучила вашу компанию «${name}» и заметила несколько точек роста:`
  }
  return 'Изучила вашу компанию и заметила несколько точек роста:'
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
  senderInput?: Partial<AppProfile> | SenderProfile,
): string {
  const sender = getSenderProfile(
    senderInput && 'phone' in senderInput ? senderInput : (senderInput as Partial<AppProfile> | undefined),
  )

  const bullets = collectOutreachBullets(lead)
  const bulletBlock = bullets.map((b) => `• ${b}`).join('\n')
  const companyPhrase = formatOutreachCompanyPhrase(lead)
  const signature = buildMessageSignature(sender)
  const displayName = getSenderDisplayName(sender) || getSenderDisplayName(DEFAULT_SENDER_PROFILE)
  const specialization = sender.specialization.trim() || DEFAULT_SENDER_PROFILE.specialization

  return `Здравствуйте!
Меня зовут ${displayName}.
Я занимаюсь ${specialization}.
${companyPhrase}
${bulletBlock}
Эти моменты могут снижать количество обращений и доверие клиентов.
Могу показать конкретные варианты улучшений и примеры решений.
Если интересно — подготовлю краткий аудит без обязательств.
${signature}`
}
