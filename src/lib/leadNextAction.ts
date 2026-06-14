import type { Lead, LeadStatus } from '@/domain/lead'

export type NextActionKey =
  | 'prepare_lead'
  | 'send_first_message'
  | 'wait_for_reply'
  | 'prepare_proposal'
  | 'request_review'
  | 'follow_up'
  | 'archive'

export type NextActionColor = 'red' | 'yellow' | 'green' | 'blue' | 'muted'

export interface LeadNextAction {
  key: NextActionKey
  label: string
  shortLabel: string
  emoji: string
  recommendedDeadline: string | null
  color: NextActionColor
}

const NEXT_ACTION_BY_STATUS: Record<LeadStatus, NextActionKey> = {
  draft: 'prepare_lead',
  ready_to_send: 'send_first_message',
  new: 'send_first_message',
  contacted: 'wait_for_reply',
  no_reply: 'follow_up',
  replied: 'prepare_proposal',
  meeting: 'prepare_proposal',
  won: 'request_review',
  lost: 'archive',
  archived: 'archive',
}

const ACTION_CONFIG: Record<
  NextActionKey,
  Omit<LeadNextAction, 'key'>
> = {
  prepare_lead: {
    label: 'Подготовить лид',
    shortLabel: 'Подготовить лид',
    emoji: '📝',
    recommendedDeadline: 'Сегодня',
    color: 'muted',
  },
  send_first_message: {
    label: 'Отправить первое сообщение',
    shortLabel: 'Первое сообщение',
    emoji: '📩',
    recommendedDeadline: 'Сегодня',
    color: 'blue',
  },
  wait_for_reply: {
    label: 'Ожидать ответ',
    shortLabel: 'Ожидание ответа',
    emoji: '⏳',
    recommendedDeadline: '3 дня',
    color: 'yellow',
  },
  prepare_proposal: {
    label: 'Подготовить предложение',
    shortLabel: 'Подготовить КП',
    emoji: '📄',
    recommendedDeadline: 'Сегодня',
    color: 'yellow',
  },
  request_review: {
    label: 'Запросить отзыв',
    shortLabel: 'Запросить отзыв',
    emoji: '⭐',
    recommendedDeadline: null,
    color: 'green',
  },
  follow_up: {
    label: 'Повторное касание',
    shortLabel: 'Повторный контакт',
    emoji: '📞',
    recommendedDeadline: 'Сегодня',
    color: 'red',
  },
  archive: {
    label: 'Архивировать',
    shortLabel: 'Архивировать',
    emoji: '📦',
    recommendedDeadline: null,
    color: 'muted',
  },
}

export function computeLeadNextAction(lead: Lead): LeadNextAction {
  const key = NEXT_ACTION_BY_STATUS[lead.status]
  const config = ACTION_CONFIG[key]

  return {
    key,
    ...config,
  }
}

export const ACTION_REQUIRED_IN_PROGRESS_STATUSES: LeadStatus[] = ['replied', 'meeting']

export interface ActionRequiredCounts {
  new: number
  noReply: number
  inProgress: number
  total: number
}

export function computeActionRequiredCounts(leads: Lead[]): ActionRequiredCounts {
  let newCount = 0
  let noReply = 0
  let inProgress = 0

  for (const lead of leads) {
    if (lead.status === 'new') newCount++
    if (lead.status === 'no_reply') noReply++
    if (ACTION_REQUIRED_IN_PROGRESS_STATUSES.includes(lead.status)) inProgress++
  }

  return {
    new: newCount,
    noReply,
    inProgress,
    total: newCount + noReply + inProgress,
  }
}

export const NEXT_ACTION_COLOR_CLASSES: Record<NextActionColor, string> = {
  red: 'text-red-700 bg-red-50 border-red-200',
  yellow: 'text-amber-700 bg-amber-50 border-amber-200',
  green: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  blue: 'text-blue-700 bg-blue-50 border-blue-200',
  muted: 'text-muted-foreground bg-muted/50 border-border',
}
