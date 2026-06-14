import type { ImprovementOpportunity, Lead } from '@/domain/lead'
import { ru } from '@/i18n/ru'
import { getNicheOutreachRecommendations } from '@/features/leads/nicheOutreachRecommendations'

export const OUTREACH_SENDER = {
  name: 'Наталья Лапкина',
  specialization: 'созданием сайтов, автоматизацией и AI-решениями для бизнеса',
  services: [
    'создание сайтов',
    'автоматизация бизнеса',
    'AI-инструменты',
    'лидогенерация',
  ],
} as const

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

export function buildOutreachMessage(lead: Lead): string {
  const bullets = collectOutreachBullets(lead)
  const bulletBlock = bullets.map((b) => `• ${b}`).join('\n')
  const companyContext = formatCompanyContext(lead)

  return `Здравствуйте!
Меня зовут ${OUTREACH_SENDER.name}.
Я занимаюсь ${OUTREACH_SENDER.specialization}.
Изучила ${companyContext} и заметила несколько точек роста:
${bulletBlock}
Эти моменты могут снижать количество обращений и доверие клиентов.
Могу показать конкретные варианты улучшений и примеры решений.
Если интересно — подготовлю краткий аудит без обязательств.
С уважением,
${OUTREACH_SENDER.name}`
}
