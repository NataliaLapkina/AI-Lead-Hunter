import type { ImprovementOpportunity, Lead } from '@/domain/lead'
import { IMPROVEMENT_OPPORTUNITIES } from '@/lib/constants'
import { ru } from '@/i18n/ru'

export function getOpportunityLabel(key: ImprovementOpportunity): string {
  return ru.opportunities[key]
}

export function getOpportunityPitch(key: ImprovementOpportunity): string {
  return ru.opportunityPitches[key]
}

export function getOpportunityRecommendation(key: ImprovementOpportunity): string {
  return ru.opportunityRecommendations[key]
}

export function buildRecommendations(opportunities: ImprovementOpportunity[]): string[] {
  return opportunities.map(getOpportunityRecommendation)
}

export function buildOutreachMessage(
  lead: Lead,
  profileName: string,
  profileBusiness: string,
): string {
  const business = profileBusiness || lead.niche
  const opportunities = lead.opportunities ?? []

  if (opportunities.length === 0) {
    return ru.leads.messageTemplate
      .replace('{name}', profileName)
      .replace('{niche}', business)
      .replace('{company}', lead.name)
  }

  const points = opportunities.map((key) => getOpportunityPitch(key)).join(' ')
  const intro = `Здравствуйте! Меня зовут ${profileName}, я занимаюсь ${business}.`
  const observation = `Изучил ${lead.name}${lead.city ? ` (${lead.city})` : ''} и заметил несколько точек роста: ${points}`
  const cta = 'Могу предложить конкретное решение и показать примеры работ. Удобно обсудить?'

  return `${intro} ${observation} ${cta}`
}

export function suggestOpportunitiesFromLead(lead: Partial<Lead>): ImprovementOpportunity[] {
  const suggested: ImprovementOpportunity[] = []

  if (!lead.website?.trim()) {
    suggested.push('no_website')
  }

  const hasWhatsApp =
    lead.contacts?.phones?.some((p) => p.replace(/\D/g, '').length >= 10) ||
    lead.contacts?.telegram?.toLowerCase().includes('whatsapp') ||
    lead.contacts?.telegram?.toLowerCase().includes('wa.me')

  if (!hasWhatsApp && !lead.contacts?.telegram) {
    suggested.push('no_whatsapp')
  }

  return suggested.filter((key) => IMPROVEMENT_OPPORTUNITIES.includes(key))
}
