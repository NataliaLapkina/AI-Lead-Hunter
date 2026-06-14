import type { AppProfile } from '@/domain/lead'

export interface SenderProfile {
  name: string
  specialization: string
  phone: string
  whatsapp: string
  telegram: string
  vk: string
  email: string
  website: string
}

export const DEFAULT_SENDER_PROFILE: SenderProfile = {
  name: 'Наталья Лапкина',
  specialization: 'созданием сайтов, автоматизацией и AI-решениями для бизнеса',
  phone: '',
  whatsapp: '',
  telegram: '',
  vk: '',
  email: '',
  website: '',
}

/** @deprecated Используйте DEFAULT_SENDER_PROFILE / getSenderProfile */
export const OUTREACH_SENDER = {
  name: DEFAULT_SENDER_PROFILE.name,
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
    businessType: '',
    specialization: DEFAULT_SENDER_PROFILE.specialization,
    phone: '',
    whatsapp: '',
    telegram: '',
    vk: '',
    email: '',
    website: '',
  }
}

export function normalizeAppProfile(
  raw: Partial<AppProfile> | undefined,
  fallback: AppProfile,
): AppProfile {
  return {
    name: raw?.name?.trim() || fallback.name,
    businessType: raw?.businessType?.trim() ?? fallback.businessType,
    specialization: raw?.specialization?.trim() || fallback.specialization,
    phone: raw?.phone?.trim() ?? fallback.phone,
    whatsapp: raw?.whatsapp?.trim() ?? fallback.whatsapp,
    telegram: raw?.telegram?.trim() ?? fallback.telegram,
    vk: raw?.vk?.trim() ?? fallback.vk,
    email: raw?.email?.trim() ?? fallback.email,
    website: raw?.website?.trim() ?? fallback.website,
  }
}

export function getSenderProfile(profile?: Partial<AppProfile>): SenderProfile {
  const base = normalizeAppProfile(profile, createDefaultAppProfile())
  return {
    name: base.name,
    specialization: base.specialization,
    phone: base.phone,
    whatsapp: base.whatsapp,
    telegram: base.telegram,
    vk: base.vk,
    email: base.email,
    website: base.website,
  }
}

export function buildMessageSignature(sender: SenderProfile): string {
  const lines = ['С уважением,', sender.name.trim() || DEFAULT_SENDER_PROFILE.name]

  if (sender.whatsapp.trim()) {
    lines.push(`WhatsApp: ${sender.whatsapp.trim()}`)
  }
  if (sender.telegram.trim()) {
    lines.push(`Telegram: ${sender.telegram.trim()}`)
  }
  if (sender.email.trim()) {
    lines.push(`Email: ${sender.email.trim()}`)
  }

  return lines.join('\n')
}
