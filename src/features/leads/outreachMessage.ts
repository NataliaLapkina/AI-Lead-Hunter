import type { ImprovementOpportunity, Lead } from '@/domain/lead'
import { ru } from '@/i18n/ru'

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

function collectProblemBullets(lead: Lead): string[] {
  const fromOpportunities = (lead.opportunities ?? []).map((key) => getOpportunityPitch(key))
  if (fromOpportunities.length > 0) {
    return fromOpportunities.slice(0, 4)
  }

  const fromAudit =
    lead.siteAudit?.findings
      ?.filter((f) => f.detected)
      .map((f) => {
        const text = f.details.trim()
        if (!text) return ''
        return text.charAt(0).toLowerCase() + text.slice(1)
      })
      .filter(Boolean) ?? []

  if (fromAudit.length > 0) {
    return fromAudit.slice(0, 4)
  }

  if (!lead.website?.trim()) {
    return ['нет сайта — клиенты не находят вас в поиске']
  }

  return [
    `есть возможности усилить цифровое присутствие для бизнеса в нише «${lead.niche}»`,
  ]
}

function formatCompanyContext(lead: Lead): string {
  if (lead.name && lead.niche) {
    return `вашу компанию «${lead.name}» (ниша: ${lead.niche})`
  }
  if (lead.name) {
    return `вашу компанию «${lead.name}»`
  }
  if (lead.niche) {
    return `ваш бизнес в нише «${lead.niche}»`
  }
  return 'вашу компанию'
}

export function buildOutreachMessage(lead: Lead): string {
  const bullets = collectProblemBullets(lead)
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
