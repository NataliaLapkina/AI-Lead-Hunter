import type { AppProfile } from '@/domain/lead'

export interface SenderProfile {
  name: string
  lastName: string
  specialization: string
  phone: string
  whatsapp: string
  telegram: string
  vk: string
  email: string
  website: string
  portfolio: string
}

export const DEFAULT_SENDER_PROFILE: SenderProfile = {
  name: 'Наталья',
  lastName: 'Лапкина',
  specialization: 'созданием сайтов, автоматизацией и AI-решениями для бизнеса',
  phone: '',
  whatsapp: '',
  telegram: '',
  vk: '',
  email: '',
  website: '',
  portfolio: '',
}

export function getSenderDisplayName(
  profile: Pick<SenderProfile, 'name' | 'lastName'>,
): string {
  return [profile.name.trim(), profile.lastName.trim()].filter(Boolean).join(' ')
}

/** @deprecated Используйте DEFAULT_SENDER_PROFILE / getSenderProfile */
export const OUTREACH_SENDER = {
  name: getSenderDisplayName(DEFAULT_SENDER_PROFILE),
  specialization: DEFAULT_SENDER_PROFILE.specialization,
  services: [
    'создание сайтов',
    'автоматизация бизнеса',
    'AI-инструменты',
    'лидогенерация',
  ],
} as const

export function createDefaultAppProfile(): AppProfile {
  return {
    name: DEFAULT_SENDER_PROFILE.name,
    lastName: DEFAULT_SENDER_PROFILE.lastName,
    businessType: '',
    specialization: DEFAULT_SENDER_PROFILE.specialization,
    phone: '',
    whatsapp: '',
    telegram: '',
    vk: '',
    email: '',
    website: '',
    portfolio: '',
  }
}

export function normalizeAppProfile(
  raw: Partial<AppProfile> | undefined,
  fallback: AppProfile,
): AppProfile {
  return {
    name: raw?.name?.trim() || fallback.name,
    lastName: raw?.lastName?.trim() ?? fallback.lastName,
    businessType: raw?.businessType?.trim() ?? fallback.businessType,
    specialization: raw?.specialization?.trim() || fallback.specialization,
    phone: raw?.phone?.trim() ?? fallback.phone,
    whatsapp: raw?.whatsapp?.trim() ?? fallback.whatsapp,
    telegram: raw?.telegram?.trim() ?? fallback.telegram,
    vk: raw?.vk?.trim() ?? fallback.vk,
    email: raw?.email?.trim() ?? fallback.email,
    website: raw?.website?.trim() ?? fallback.website,
    portfolio: raw?.portfolio?.trim() ?? fallback.portfolio,
  }
}

export function getSenderProfile(profile?: Partial<AppProfile>): SenderProfile {
  const base = normalizeAppProfile(profile, createDefaultAppProfile())
  return {
    name: base.name,
    lastName: base.lastName,
    specialization: base.specialization,
    phone: base.phone,
    whatsapp: base.whatsapp,
    telegram: base.telegram,
    vk: base.vk,
    email: base.email,
    website: base.website,
    portfolio: base.portfolio,
  }
}

export function buildMessageSignature(sender: SenderProfile): string {
  const displayName =
    getSenderDisplayName(sender) || getSenderDisplayName(DEFAULT_SENDER_PROFILE)
  const lines = ['С уважением,', displayName]

  const contactLines: Array<[string, string]> = [
    ['WhatsApp', sender.whatsapp],
    ['Telegram', sender.telegram],
    ['VK', sender.vk],
    ['Email', sender.email],
    ['Портфолио', sender.portfolio],
  ]

  for (const [label, value] of contactLines) {
    const trimmed = value.trim()
    if (trimmed) {
      lines.push(`${label}: ${trimmed}`)
    }
  }

  return lines.join('\n')
}
