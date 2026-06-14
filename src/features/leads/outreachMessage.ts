import type { ImprovementOpportunity, Lead } from '@/domain/lead'
import { ru } from '@/i18n/ru'
import { getNicheOutreachRecommendations } from '@/features/leads/nicheOutreachRecommendations'
import {
  DEFAULT_SENDER_PROFILE,
  OUTREACH_SENDER,
  buildMessageSignature,
  getSenderProfile,
  type SenderProfile,
} from '@/lib/senderProfile'
import type { AppProfile } from '@/domain/lead'

export { OUTREACH_SENDER, getSenderProfile, buildMessageSignature }
export type { SenderProfile }

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

function formatCompanyContext(lead: Lead): string {
  if (lead.name) {
    return `вашу компанию «${lead.name}»`
  }
  return 'вашу компанию'
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
  const companyContext = formatCompanyContext(lead)
  const signature = buildMessageSignature(sender)
  const name = sender.name.trim() || DEFAULT_SENDER_PROFILE.name
  const specialization = sender.specialization.trim() || DEFAULT_SENDER_PROFILE.specialization

  return `Здравствуйте!
Меня зовут ${name}.
Я занимаюсь ${specialization}.
Изучила ${companyContext} и заметила несколько точек роста:
${bulletBlock}
Эти моменты могут снижать количество обращений и доверие клиентов.
Могу показать конкретные варианты улучшений и примеры решений.
Если интересно — подготовлю краткий аудит без обязательств.
${signature}`
}
