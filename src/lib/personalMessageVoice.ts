import type { AppProfile } from '@/domain/lead'
import { getSenderDisplayName, getSenderProfile, resolveOutreachProfile } from '@/lib/senderProfile'

/** Формулировки корпоративного «мы/наша», запрещённые в личных сообщениях. */
export const PERSONAL_VOICE_FORBIDDEN_PHRASES = [
  'наша работа',
  'нашей работе',
  'нашей работы',
  'мы сделали',
  'мы предлагаем',
  'наши специалисты',
  'наша компания',
  'рекомендовали бы нас',
  'рекомендуете нас',
  'мы можем',
  'мы готовы',
  'Предлагаем:',
] as const

const PERSONAL_VOICE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/нашей работе/gi, 'моей работе'],
  [/нашей работы/gi, 'моей работы'],
  [/наша работа/gi, 'моя работа'],
  [/рекомендовали бы нас/gi, 'порекомендовали бы меня'],
  [/рекомендуете нас/gi, 'рекомендуете меня'],
  [/мы сделали/gi, 'я сделала'],
  [/мы предлагаем/gi, 'предлагаю'],
  [/наши специалисты/gi, 'я'],
  [/наша компания/gi, 'я'],
  [/мы можем/gi, 'могу'],
  [/мы готовы/gi, 'готова'],
  [/Предлагаем:/g, 'Предлагаю:'],
]

const NATALIA_LAPKINA_PATTERN = /наталья\s+лапкина/i

/** Личное обращение от частного специалиста (Наталья Лапкина и аналогичные профили). */
export function usesPersonalFirstPersonVoice(profile?: Partial<AppProfile> | null): boolean {
  const displayName = getSenderDisplayName(getSenderProfile(profile))
  if (!displayName.trim()) return true
  if (NATALIA_LAPKINA_PATTERN.test(displayName)) return true

  const businessType = resolveOutreachProfile(profile).businessType?.toLowerCase() ?? ''
  if (
    businessType.includes('ооо') ||
    businessType.includes('компания') ||
    businessType.includes('агентство')
  ) {
    return false
  }

  return true
}

export function normalizePersonalVoice(
  text: string,
  profile?: Partial<AppProfile> | null,
): string {
  if (!usesPersonalFirstPersonVoice(profile)) return text

  let result = text
  for (const [pattern, replacement] of PERSONAL_VOICE_REPLACEMENTS) {
    result = result.replace(pattern, replacement)
  }
  return result
}

export function containsForbiddenPersonalVoice(text: string): string | null {
  const lower = text.toLowerCase()
  for (const phrase of PERSONAL_VOICE_FORBIDDEN_PHRASES) {
    if (lower.includes(phrase.toLowerCase())) return phrase
  }
  return null
}
