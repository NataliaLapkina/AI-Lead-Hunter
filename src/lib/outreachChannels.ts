import type { Lead } from '@/domain/lead'

function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, '')
}

function ensureHttpUrl(value: string): string {
  const trimmed = value.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('//')) return `https:${trimmed}`
  return `https://${trimmed.replace(/^\/+/, '')}`
}

export function resolveTelegramUrl(value: string): string {
  const trimmed = value.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^(t\.me|telegram\.me)\//i.test(trimmed)) return ensureHttpUrl(trimmed)
  if (trimmed.startsWith('@')) return `https://t.me/${trimmed.slice(1)}`
  return `https://t.me/${trimmed}`
}

export function resolveVkUrl(value: string): string {
  const trimmed = value.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.includes('vk.com/') || trimmed.includes('vk.ru/')) return ensureHttpUrl(trimmed)
  return ensureHttpUrl(`vk.com/${trimmed.replace(/^@/, '')}`)
}

export function getLeadPhone(lead: Lead): string | null {
  return lead.contacts.phone?.trim() || null
}

export function getLeadTelegramUrl(lead: Lead): string | null {
  const telegram = lead.contacts.telegram?.trim()
  if (!telegram) return null
  return resolveTelegramUrl(telegram)
}

export function getLeadVkUrl(lead: Lead): string | null {
  const vk = lead.contacts.vk?.trim()
  if (!vk) return null
  return resolveVkUrl(vk)
}

export function getLeadEmail(lead: Lead): string | null {
  return lead.contacts.email?.trim() || null
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = digitsOnly(phone)
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

export function buildEmailUrl(email: string, subject: string, body: string): string {
  const params = new URLSearchParams({ subject, body })
  return `mailto:${email}?${params.toString()}`
}

export function openExternalUrl(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer')
}
