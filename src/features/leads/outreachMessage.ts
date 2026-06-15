import type { ImprovementOpportunity, Lead, AppProfile, AISettings, AIMessageGoal, AIProfile } from '@/domain/lead'
import { ru } from '@/i18n/ru'
import { getNicheOutreachRecommendations } from '@/features/leads/nicheOutreachRecommendations'
import { isTechnicalLeadName, sanitizeLeadName } from '@/lib/leadLinks'
import {
  DEFAULT_SENDER_PROFILE,
  OUTREACH_SENDER,
  buildSenderSignature,
  getSenderDisplayName,
  getSenderProfile,
  resolveOutreachProfile,
  stripMessageSignature,
  type SenderProfile,
} from '@/lib/senderProfile'
import { normalizePersonalVoice } from '@/lib/personalMessageVoice'
import {
  getClosingLine,
  getConsequencesLine,
  getValueLine,
  LENGTH_BULLET_LIMIT,
  normalizeAISettings,
  STYLE_GREETINGS,
} from '@/lib/aiMessageSettings'
import { buildPositioningBlock, normalizeAIProfile } from '@/lib/aiProfile'

export { OUTREACH_SENDER, getSenderProfile, buildSenderSignature, getSenderDisplayName, resolveOutreachProfile }
export { buildSenderSignature as buildMessageSignature } from '@/lib/senderProfile'
export { sanitizeLeadName, isTechnicalLeadName } from '@/lib/leadLinks'
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

const LEGACY_MESSAGE_PATTERNS: RegExp[] = [
  /«\s*Item\s+\d+\s*»/gi,
  /\bItem\s+\d+\b/gi,
  /«\s*[^»]*Яндекс\s+Карты\s*[—\-–][^»]*»/gi,
  /Яндекс\s+Карты\s*[—\-–]\s*[^\n.!?«»]+/gi,
  /«\s*[^»]*Авито\s*[—\-–][^»]*»/gi,
  /Авито\s*[—\-–]\s*[^\n.!?«»]+/gi,
  /«\s*[^»]*(?:из Авито|из Яндекс Карт|из 2ГИС|Компания из VK)[^»]*»/gi,
  /(?:из Авито|из Яндекс Карт|из 2ГИС|Компания из VK)/gi,
  /https?:\/\/[^\s»]+/gi,
]

export function scrubLegacyNamesFromText(text: string): string {
  let result = text
  for (const pattern of LEGACY_MESSAGE_PATTERNS) {
    result = result.replace(pattern, '')
  }
  return result
}

export function scrubTechnicalLeadNamesFromMessage(message: string, lead: Lead): string {
  let result = scrubLegacyNamesFromText(message)
  const rawName = lead.name?.trim()

  if (rawName && isTechnicalLeadName(rawName, lead)) {
    result = result.replace(new RegExp(`«\\s*${escapeRegExp(rawName)}\\s*»`, 'gi'), '')
    result = result.replace(new RegExp(escapeRegExp(rawName), 'gi'), '')
  }

  result = result.replace(/\b(undefined|null)\b/gi, '')
  result = result.replace(/Изучила вашу компанию\s+«\s*»\s*и заметила/gi, 'Изучила вашу компанию и заметила')
  result = result.replace(/Изучила вашу компанию\s+и\s+и заметила/gi, 'Изучила вашу компанию и заметила')
  result = result.replace(/Изучила\s+и заметила/gi, 'Изучила вашу компанию и заметила')
  result = result.replace(/Изучила вашу компанию\s+и заметила/g, 'Изучила вашу компанию и заметила')
  result = result.replace(/\n{3,}/g, '\n\n')

  return result.trimEnd()
}

export function finalizeOutreachMessage(
  message: string,
  lead: Lead,
  senderProfile?: Partial<AppProfile> | null,
  aiSettings?: Partial<AISettings> | null,
): string {
  const settings = normalizeAISettings(aiSettings)
  const body = stripMessageSignature(message)
  const scrubbedBody = scrubTechnicalLeadNamesFromMessage(body, lead)
  const voicedBody = normalizePersonalVoice(scrubbedBody, senderProfile)
  const signature = buildSenderSignature(senderProfile)
  if (!voicedBody) return settings.useAutoSignature ? signature : ''
  if (!settings.useAutoSignature) return voicedBody
  return `${voicedBody}\n${signature}`
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

function getOpeningLine(lead: Lead, goal: AIMessageGoal): string {
  switch (goal) {
    case 'followup':
      return 'Писала вам ранее и хотела уточнить, удалось ли ознакомиться с предложением.'
    case 'reactivation':
      return 'Давно не общались — решила написать с актуальным предложением.'
    case 'sell':
    case 'contact_request':
    case 'introduction':
    default:
      return getSafeLeadIntro(lead)
  }
}

function getSpecializationBlock(
  sender: ReturnType<typeof getSenderProfile>,
  settings: AISettings,
): string {
  const specialization =
    sender.specialization.trim() || DEFAULT_SENDER_PROFILE.specialization
  const topic = settings.offerTopic.trim()

  if (!topic) {
    return `Я занимаюсь ${specialization}.`
  }

  if (settings.messageGoal === 'sell') {
    return `Я занимаюсь ${specialization}.\nСейчас предлагаю: ${topic}.`
  }

  return `Я занимаюсь ${specialization}.\nФокус предложения: ${topic}.`
}

export function buildOutreachMessage(
  lead: Lead,
  senderProfile?: Partial<AppProfile>,
  aiSettings?: Partial<AISettings> | null,
  aiProfile?: Partial<AIProfile> | null,
): string {
  const settings = normalizeAISettings(aiSettings)
  const profile = normalizeAIProfile(aiProfile)
  const sender = getSenderProfile(senderProfile)
  const displayName =
    getSenderDisplayName(sender) || getSenderDisplayName(DEFAULT_SENDER_PROFILE)
  const greeting = STYLE_GREETINGS[settings.communicationStyle]
  const bullets = collectOutreachBullets(lead).slice(0, LENGTH_BULLET_LIMIT[settings.messageLength])
  const bulletBlock = bullets.map((b) => `• ${b}`).join('\n')
  const opening = getOpeningLine(lead, settings.messageGoal)
  const positioning = buildPositioningBlock(profile)
  const consequences = getConsequencesLine(settings.communicationStyle, settings.messageLength)
  const valueLine = getValueLine(settings.communicationStyle, settings.messageLength)
  const closing = getClosingLine(
    settings.messageGoal,
    settings.offerTopic,
    settings.messageLength,
    settings.tone,
  )

  const body = [
    greeting,
    `Меня зовут ${displayName}.`,
    getSpecializationBlock(sender, settings),
    positioning,
    opening,
    bulletBlock,
    consequences,
    valueLine,
    closing,
  ]
    .filter(Boolean)
    .join('\n')

  return finalizeOutreachMessage(body, lead, senderProfile, settings)
}
