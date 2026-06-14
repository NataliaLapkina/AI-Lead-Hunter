import type { LeadContacts } from '@/domain/lead'

function trimOptional(value?: string): string | undefined {
  const trimmed = value?.trim()
  return trimmed || undefined
}

export function createEmptyLeadContacts(): LeadContacts {
  return {}
}

export function normalizeLeadContacts(raw?: Partial<LeadContacts> | null): LeadContacts {
  if (!raw) return {}

  const legacy = raw as Partial<LeadContacts> & { whatsapp?: string }

  return {
    email: trimOptional(raw.email),
    phone: trimOptional(raw.phone ?? legacy.whatsapp),
    telegram: trimOptional(raw.telegram),
    vk: trimOptional(raw.vk),
  }
}

/** Миграция legacy contacts */
export function migrateLegacyContacts(raw: unknown): LeadContacts {
  if (!raw || typeof raw !== 'object') return {}

  const legacy = raw as {
    email?: string
    phone?: string
    whatsapp?: string
    telegram?: string
    vk?: string
    emails?: string[]
    phones?: string[]
  }

  return normalizeLeadContacts({
    email: legacy.email ?? legacy.emails?.[0],
    phone: legacy.phone ?? legacy.whatsapp ?? legacy.phones?.[0],
    telegram: legacy.telegram,
    vk: legacy.vk,
  })
}

export function hasAnyLeadContact(
  contacts: LeadContacts,
  website?: string,
  sourceUrl?: string,
): boolean {
  return Boolean(
    website?.trim() ||
      sourceUrl?.trim() ||
      contacts.email ||
      contacts.phone ||
      contacts.telegram ||
      contacts.vk,
  )
}
