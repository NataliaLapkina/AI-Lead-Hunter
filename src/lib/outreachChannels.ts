import type { Lead } from '@/domain/lead'

function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, '')
}

function normalizeTelegramHandle(value: string): string {
  return value.trim().replace(/^@/, '').replace(/^https?:\/\/(t\.me|telegram\.me)\//i, '')
}

function extractVkPath(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed)
      if (url.hostname.includes('vk.com') || url.hostname.includes('vk.ru')) {
        return url.pathname.replace(/^\//, '')
      }
    } catch {
      return null
    }
  }
  if (trimmed.includes('vk.com/') || trimmed.includes('vk.ru/')) {
    return trimmed.split(/vk\.(com|ru)\//i)[1]?.replace(/^\//, '') ?? null
  }
  return trimmed.replace(/^@/, '')
}

export function getLeadWhatsAppPhone(lead: Lead): string | null {
  const phones = lead.contacts.phones.map(digitsOnly).filter((p) => p.length >= 10)
  if (phones.length > 0) return phones[0]

  const tg = lead.contacts.telegram?.toLowerCase() ?? ''
  if (tg.includes('wa.me/')) {
    const match = tg.match(/wa\.me\/(\d+)/)
    if (match) return match[1]
  }
  if (tg.includes('whatsapp') && /\d{10,}/.test(tg)) {
    const match = tg.match(/(\d{10,})/)
    if (match) return match[1]
  }

  return null
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = digitsOnly(phone)
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

export function getLeadTelegramHandle(lead: Lead): string | null {
  const tg = lead.contacts.telegram?.trim()
  if (!tg) return null
  if (tg.toLowerCase().includes('whatsapp') || tg.toLowerCase().includes('wa.me')) {
    return null
  }
  const handle = normalizeTelegramHandle(tg)
  return handle || null
}

export function buildTelegramShareUrl(message: string): string {
  return `https://t.me/share/url?text=${encodeURIComponent(message)}`
}

export function buildTelegramChatUrl(handle: string): string {
  return `https://t.me/${normalizeTelegramHandle(handle)}`
}

export function getLeadVkTarget(lead: Lead): string | null {
  const candidates = [lead.contacts.telegram, lead.website].filter(Boolean) as string[]
  for (const value of candidates) {
    if (value.toLowerCase().includes('vk.com') || value.toLowerCase().includes('vk.ru')) {
      const path = extractVkPath(value)
      if (path) return path
    }
  }
  if (lead.source === 'vk' && lead.website) {
    const path = extractVkPath(lead.website)
    if (path) return path
  }
  return null
}

export function buildVkProfileUrl(vkTarget: string): string {
  const path = extractVkPath(vkTarget) ?? vkTarget.replace(/^@/, '')
  return `https://vk.com/${path}`
}

export function buildVkShareUrl(message: string): string {
  return `https://vk.com/share.php?comment=${encodeURIComponent(message)}`
}

export function getLeadEmail(lead: Lead): string | null {
  return lead.contacts.emails[0]?.trim() || null
}

export function buildEmailUrl(email: string, subject: string, body: string): string {
  const params = new URLSearchParams({
    subject,
    body,
  })
  return `mailto:${email}?${params.toString()}`
}

export function openExternalUrl(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer')
}
