import type { Lead, LeadMessageVariant, UpdateLeadInput } from '@/domain/lead'
import { generateId } from '@/lib/utils'

export const MAX_LEAD_MESSAGE_HISTORY = 10

export function normalizeMessageHistory(
  history: LeadMessageVariant[] | undefined | null,
): LeadMessageVariant[] {
  if (!history?.length) return []

  return history
    .filter(
      (item): item is LeadMessageVariant =>
        Boolean(item?.id && typeof item.content === 'string' && typeof item.createdAt === 'string'),
    )
    .slice(0, MAX_LEAD_MESSAGE_HISTORY)
}

export function pushMessageToHistory(
  history: LeadMessageVariant[] | undefined,
  content: string,
  createdAt = new Date().toISOString(),
): LeadMessageVariant[] {
  const trimmed = content.trim()
  if (!trimmed) return normalizeMessageHistory(history)

  const entry: LeadMessageVariant = {
    id: generateId(),
    content: trimmed,
    createdAt,
  }

  const withoutDuplicate = (history ?? []).filter((item) => item.content.trim() !== trimmed)
  return [entry, ...withoutDuplicate].slice(0, MAX_LEAD_MESSAGE_HISTORY)
}

export function buildRegeneratedMessageUpdate(
  lead: Lead,
  newMessage: string,
  options?: { archiveCurrent?: boolean },
): Pick<UpdateLeadInput, 'generatedMessage' | 'messageHistory'> {
  const archiveCurrent = options?.archiveCurrent ?? true
  const trimmed = newMessage.trim()
  let messageHistory = normalizeMessageHistory(lead.messageHistory)

  if (archiveCurrent && lead.generatedMessage?.trim() && lead.generatedMessage.trim() !== trimmed) {
    messageHistory = pushMessageToHistory(messageHistory, lead.generatedMessage)
  }

  return {
    generatedMessage: trimmed,
    messageHistory,
  }
}

export function buildRestoreMessageUpdate(
  lead: Lead,
  variantId: string,
): Pick<UpdateLeadInput, 'generatedMessage' | 'messageHistory'> | null {
  const history = normalizeMessageHistory(lead.messageHistory)
  const variant = history.find((item) => item.id === variantId)
  if (!variant) return null

  let nextHistory = history
  if (lead.generatedMessage?.trim() && lead.generatedMessage.trim() !== variant.content.trim()) {
    nextHistory = pushMessageToHistory(
      history.filter((item) => item.id !== variantId),
      lead.generatedMessage,
    )
  } else {
    nextHistory = history.filter((item) => item.id !== variantId)
  }

  return {
    generatedMessage: variant.content,
    messageHistory: nextHistory,
  }
}
