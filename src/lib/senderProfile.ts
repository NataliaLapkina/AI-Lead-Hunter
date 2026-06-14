import type { AppProfile, AppSettings } from '@/domain/lead'
import { STORAGE_KEYS } from '@/lib/constants'
import { getStorageItem } from '@/lib/storage'

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

function pickOptionalString(value: string | undefined, fallback: string): string {
  if (value === undefined || value === null) return fallback
  return value.trim()
}

export function normalizeAppProfile(
  raw: Partial<AppProfile> | undefined,
  fallback: AppProfile,
): AppProfile {
  const legacy = (raw ?? {}) as Partial<AppProfile> & { firstName?: string }

  let name = raw?.name?.trim() || legacy.firstName?.trim() || fallback.name
  let lastName =
    raw?.lastName !== undefined
      ? (raw.lastName?.trim() ?? '')
      : legacy.lastName?.trim() ?? fallback.lastName

  if (!raw?.lastName?.trim() && !legacy.lastName?.trim() && name.includes(' ')) {
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      name = parts[0]
      lastName = parts.slice(1).join(' ')
    }
  }

  return {
    name: name || fallback.name,
    lastName,
    businessType: pickOptionalString(raw?.businessType, fallback.businessType),
    specialization: raw?.specialization?.trim() || fallback.specialization,
    phone: pickOptionalString(raw?.phone, fallback.phone),
    whatsapp: pickOptionalString(raw?.whatsapp, fallback.whatsapp),
    telegram: pickOptionalString(raw?.telegram, fallback.telegram),
    vk: pickOptionalString(raw?.vk, fallback.vk),
    email: pickOptionalString(raw?.email, fallback.email),
    website: pickOptionalString(raw?.website, fallback.website),
    portfolio: pickOptionalString(raw?.portfolio, fallback.portfolio),
  }
}

export function readStoredAppProfile(): AppProfile {
  const settings = getStorageItem<AppSettings | null>(STORAGE_KEYS.SETTINGS, null)
  return normalizeAppProfile(settings?.profile, createDefaultAppProfile())
}

export function resolveOutreachProfile(profile?: Partial<AppProfile> | null): AppProfile {
  const stored = readStoredAppProfile()
  if (!profile) return stored

  return normalizeAppProfile(
    {
      name: profile.name?.trim() || stored.name,
      lastName:
        profile.lastName !== undefined ? (profile.lastName?.trim() ?? '') : stored.lastName,
      businessType: profile.businessType?.trim() ?? stored.businessType,
      specialization: profile.specialization?.trim() || stored.specialization,
      phone: profile.phone?.trim() || stored.phone,
      whatsapp: profile.whatsapp?.trim() || stored.whatsapp,
      telegram: profile.telegram?.trim() || stored.telegram,
      vk: profile.vk?.trim() || stored.vk,
      email: profile.email?.trim() || stored.email,
      website: profile.website?.trim() || stored.website,
      portfolio: profile.portfolio?.trim() || stored.portfolio,
    },
    createDefaultAppProfile(),
  )
}

export function getSenderProfile(profile?: Partial<AppProfile> | null): SenderProfile {
  const base = resolveOutreachProfile(profile)
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

function isFilledContactValue(value: string | undefined): value is string {
  const trimmed = value?.trim() ?? ''
  return Boolean(trimmed && trimmed !== 'undefined' && trimmed !== 'null')
}

export function normalizeContactEmail(email: string): string {
  return email.replace(/\s+/g, '')
}

function formatContactValue(label: string, value: string): string {
  if (label === 'Email') {
    return normalizeContactEmail(value.trim())
  }
  return value.trim()
}

/** Подпись с контактами из профиля; пустые поля скрываются, email без пробелов. */
export function buildSenderSignature(profile?: Partial<AppProfile> | null): string {
  const sender = getSenderProfile(profile)
  const displayName =
    getSenderDisplayName(sender) || getSenderDisplayName(DEFAULT_SENDER_PROFILE)
  const lines = ['С уважением,', displayName]

  const contactLines: Array<[string, string | undefined]> = [
    ['WhatsApp', sender.whatsapp],
    ['Telegram', sender.telegram],
    ['VK', sender.vk],
    ['Email', sender.email],
    ['Сайт', sender.website],
    ['Портфолио', sender.portfolio],
  ]

  for (const [label, value] of contactLines) {
    if (!isFilledContactValue(value)) continue
    lines.push(`${label}: ${formatContactValue(label, value)}`)
  }

  return lines.join('\n')
}

/** @deprecated Используйте buildSenderSignature */
export function buildMessageSignature(sender: SenderProfile): string {
  return buildSenderSignature({
    name: sender.name,
    lastName: sender.lastName,
    whatsapp: sender.whatsapp,
    telegram: sender.telegram,
    vk: sender.vk,
    email: sender.email,
    website: sender.website,
    portfolio: sender.portfolio,
  })
}

const SIGNATURE_MARKER = 'С уважением,'

export function stripMessageSignature(message: string): string {
  const idx = message.lastIndexOf(SIGNATURE_MARKER)
  if (idx === -1) return message.trimEnd()
  return message.slice(0, idx).trimEnd()
}

export function applyMessageSignature(
  message: string,
  profile?: Partial<AppProfile> | null,
): string {
  const body = stripMessageSignature(message)
  const signature = buildSenderSignature(profile)
  if (!body) return signature
  return `${body}\n${signature}`
}
