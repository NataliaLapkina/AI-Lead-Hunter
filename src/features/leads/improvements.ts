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

export { buildOutreachMessage, collectOutreachBullets } from '@/features/leads/outreachMessage'
export { OUTREACH_SENDER, getSenderProfile, buildMessageSignature } from '@/lib/senderProfile'
export {
  getNicheOutreachRecommendations,
  resolveNicheRecommendationKey,
  NICHE_OUTREACH_RECOMMENDATIONS,
  UNIVERSAL_OUTREACH_RECOMMENDATIONS,
} from '@/features/leads/nicheOutreachRecommendations'

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
