import type { Lead, LeadComment, LeadActivity } from '@/domain/lead'
import { generateId } from '@/lib/utils'

export function createComment(text: string): LeadComment {
  return {
    id: generateId(),
    text: text.trim(),
    createdAt: new Date().toISOString(),
  }
}

export function appendComment(lead: Lead, text: string): Lead {
  const comment = createComment(text)
  const activity: LeadActivity = {
    id: generateId(),
    type: 'comment_added',
    timestamp: comment.createdAt,
    payload: { commentId: comment.id, text: comment.text },
  }

  return {
    ...lead,
    comments: [comment, ...(lead.comments ?? [])],
    updatedAt: comment.createdAt,
    activityLog: [activity, ...lead.activityLog],
  }
}

export function appendActivity(
  lead: Lead,
  type: LeadActivity['type'],
  payload: Record<string, unknown> = {},
): Lead {
  const now = new Date().toISOString()
  const activity: LeadActivity = {
    id: generateId(),
    type,
    timestamp: now,
    payload,
  }

  return {
    ...lead,
    updatedAt: now,
    activityLog: [activity, ...lead.activityLog],
  }
}
