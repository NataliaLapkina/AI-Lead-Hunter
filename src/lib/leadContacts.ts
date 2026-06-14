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

  return {
    email: trimOptional(raw.email),
    whatsapp: trimOptional(raw.whatsapp),
    telegram: trimOptional(raw.telegram),
    vk: trimOptional(raw.vk),
  }
}

/** Миграция legacy contacts { emails[], phones[], telegram } */
export function migrateLegacyContacts(raw: unknown): LeadContacts {
  if (!raw || typeof raw !== 'object') return {}

  const legacy = raw as {
    email?: string
    whatsapp?: string
    telegram?: string
    vk?: string
    emails?: string[]
    phones?: string[]
  }

  return normalizeLeadContacts({
    email: legacy.email ?? legacy.emails?.[0],
    whatsapp: legacy.whatsapp ?? legacy.phones?.[0],
    telegram: legacy.telegram,
    vk: legacy.vk,
  })
}

export function hasAnyLeadContact(contacts: LeadContacts, website?: string): boolean {
  return Boolean(
    website?.trim() ||
      contacts.email ||
      contacts.whatsapp ||
      contacts.telegram ||
      contacts.vk,
  )
}
