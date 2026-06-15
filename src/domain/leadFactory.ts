import type {
  Lead,
  CreateLeadInput,
  UpdateLeadInput,
  LeadActivity,
} from '@/domain/lead'
import { generateId } from '@/lib/utils'
import { normalizeNicheName } from '@/lib/nicheDisplay'
import { createEmptyLeadContacts, normalizeLeadContacts } from '@/lib/leadContacts'
import { splitWebsiteAndSourceUrl } from '@/lib/leadLinks'

export function createEmptyContacts(): Lead['contacts'] {
  return createEmptyLeadContacts()
}

export function createLeadEntity(input: CreateLeadInput): Lead {
  const now = new Date().toISOString()
  const activity: LeadActivity = {
    id: generateId(),
    type: 'created',
    timestamp: now,
    payload: { source: input.source },
  }

  const links = splitWebsiteAndSourceUrl(input.website, input.sourceUrl)

  return {
    id: generateId(),
    name: input.name,
    niche: normalizeNicheName(input.niche),
    city: input.city,
    source: input.source,
    website: links.website,
    sourceUrl: links.sourceUrl,
    contacts: normalizeLeadContacts(input.contacts),
    notes: input.notes,
    generatedMessage: input.generatedMessage,
    status: input.status ?? 'new',
    tags: input.tags,
    opportunities: input.opportunities ?? [],
    comments: [],
    createdAt: now,
    updatedAt: now,
    activityLog: [activity],
  }
}

export function updateLeadEntity(lead: Lead, input: UpdateLeadInput): Lead {
  const now = new Date().toISOString()
  const activityLog = [...lead.activityLog]

  if (input.status && input.status !== lead.status) {
    activityLog.push({
      id: generateId(),
      type: 'status_change',
      timestamp: now,
      payload: { from: lead.status, to: input.status },
    })
  }

  if (input.generatedMessage && input.generatedMessage !== lead.generatedMessage) {
    activityLog.push({
      id: generateId(),
      type: 'message_generated',
      timestamp: now,
      payload: { preview: input.generatedMessage.slice(0, 120) },
    })
  }

  if (input.siteAudit && input.siteAudit.auditedAt !== lead.siteAudit?.auditedAt) {
    activityLog.push({
      id: generateId(),
      type: 'site_audited',
      timestamp: now,
      payload: {
        summary: input.siteAudit.summary,
        score: input.siteAudit.score,
      },
    })
  }

  activityLog.push({
    id: generateId(),
    type: 'updated',
    timestamp: now,
    payload: {},
  })

  return {
    ...lead,
    ...input,
    niche: input.niche !== undefined ? normalizeNicheName(input.niche) : lead.niche,
    website: input.website === '' ? undefined : (input.website ?? lead.website),
    sourceUrl: input.sourceUrl === '' ? undefined : (input.sourceUrl ?? lead.sourceUrl),
    contacts: input.contacts !== undefined ? normalizeLeadContacts(input.contacts) : lead.contacts,
    tags: input.tags ?? lead.tags,
    opportunities: input.opportunities ?? lead.opportunities ?? [],
    generatedMessage: input.generatedMessage ?? lead.generatedMessage,
    messageHistory: input.messageHistory ?? lead.messageHistory,
    aiRecommendations: input.aiRecommendations ?? lead.aiRecommendations,
    siteAudit: input.siteAudit ?? lead.siteAudit,
    updatedAt: now,
    activityLog,
  }
}

export function normalizeWebsite(url?: string): string | undefined {
  if (!url) return undefined
  const trimmed = url.trim().toLowerCase()
  return trimmed.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}
