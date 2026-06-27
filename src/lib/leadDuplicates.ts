import type { Lead } from '@/domain/lead'
import { normalizeEmail } from '@/domain/leadFactory'
import { normalizePhoneForComparison, normalizeUrlForComparison } from '@/lib/normalizeLeadInput'

export interface LeadDuplicateCriteria {
  website?: string
  sourceUrl?: string
  email?: string
  phone?: string
}

function matchesPhone(candidate?: string, existing?: string): boolean {
  if (!candidate?.trim() || !existing?.trim()) return false
  const left = normalizePhoneForComparison(candidate)
  const right = normalizePhoneForComparison(existing)
  return Boolean(left && right && left === right)
}

export function findMatchingLeads(leads: Lead[], criteria: LeadDuplicateCriteria): Lead[] {
  const normalizedEmail = criteria.email ? normalizeEmail(criteria.email) : undefined
  const normalizedWebsite = criteria.website?.trim()
    ? normalizeUrlForComparison(criteria.website)
    : undefined
  const normalizedSourceUrl = criteria.sourceUrl?.trim()
    ? normalizeUrlForComparison(criteria.sourceUrl)
    : undefined

  return leads.filter((lead) => {
    if (normalizedWebsite && lead.website) {
      if (normalizeUrlForComparison(lead.website) === normalizedWebsite) return true
    }

    if (normalizedSourceUrl) {
      if (lead.sourceUrl && normalizeUrlForComparison(lead.sourceUrl) === normalizedSourceUrl) {
        return true
      }
      if (lead.website && normalizeUrlForComparison(lead.website) === normalizedSourceUrl) {
        return true
      }
    }

    if (normalizedEmail && lead.contacts.email) {
      if (normalizeEmail(lead.contacts.email) === normalizedEmail) return true
    }

    if (criteria.phone && lead.contacts.phone) {
      if (matchesPhone(criteria.phone, lead.contacts.phone)) return true
    }

    return false
  })
}
