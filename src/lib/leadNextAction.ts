import type { Lead, LeadStatus } from '@/domain/lead'
import { computeNextActionDeadline } from '@/lib/leadNextActionDeadline'
import type {
  LeadDetailFocus,
  NextActionColor,
  NextActionKey,
} from '@/lib/leadNextActionTypes'

export type { LeadDetailFocus, NextActionColor, NextActionKey } from '@/lib/leadNextActionTypes'

export interface LeadNextAction {
  key: NextActionKey
  label: string
  shortLabel: string
  emoji: string
  recommendedDeadline: string | null
  dueAt: string | null
  isOverdue: boolean
  overdueDays: number
  color: NextActionColor
  tooltip: string
  focus: LeadDetailFocus
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

type NextActionConfig = Omit<
  LeadNextAction,
  'key' | 'recommendedDeadline' | 'dueAt' | 'isOverdue' | 'overdueDays'
>

const ACTION_CONFIG: Record<NextActionKey, NextActionConfig> = {
  prepare_lead: {
    label: 'Подготовить лид',
    shortLabel: 'Подготовить лид',
    emoji: '📝',
    color: 'muted',
    tooltip: 'Открыть карточку',
    focus: 'overview',
  },
  send_first_message: {
    label: 'Отправить первое сообщение',
    shortLabel: 'Первое сообщение',
    emoji: '📩',
    color: 'blue',
    tooltip: 'Открыть сообщение',
    focus: 'message',
  },
  wait_for_reply: {
    label: 'Ожидать ответ',
    shortLabel: 'Ожидание ответа',
    emoji: '⏳',
    color: 'yellow',
    tooltip: 'Посмотреть историю',
    focus: 'history',
  },
  prepare_proposal: {
    label: 'Подготовить предложение',
    shortLabel: 'Подготовить КП',
    emoji: '📄',
    color: 'yellow',
    tooltip: 'Подготовить КП',
    focus: 'proposal',
  },
  request_review: {
    label: 'Запросить отзыв',
    shortLabel: 'Запросить отзыв',
    emoji: '⭐',
    color: 'green',
    tooltip: 'Отправить запрос отзыва',
    focus: 'review',
  },
  follow_up: {
    label: 'Повторное касание',
    shortLabel: 'Повторный контакт',
    emoji: '📞',
    color: 'red',
    tooltip: 'Открыть сообщение',
    focus: 'message',
  },
  archive: {
    label: 'Архивировать',
    shortLabel: 'Архивировать',
    emoji: '📦',
    color: 'muted',
    tooltip: 'Открыть карточку',
    focus: 'overview',
  },
}

export function computeLeadNextAction(
  lead: Lead,
  referenceDate: Date = new Date(),
): LeadNextAction {
  const key = NEXT_ACTION_BY_STATUS[lead.status]
  const config = ACTION_CONFIG[key]
  const deadline = computeNextActionDeadline(lead, key, referenceDate)

  const tooltip = deadline.recommendedDeadline
    ? `${config.tooltip} · ${deadline.recommendedDeadline}`
    : config.tooltip

  return {
    key,
    ...config,
    color: deadline.isOverdue ? 'red' : config.color,
    tooltip,
    dueAt: deadline.dueAt,
    isOverdue: deadline.isOverdue,
    overdueDays: deadline.overdueDays,
    recommendedDeadline: deadline.recommendedDeadline,
  }
}

export function getNextActionFocus(key: NextActionKey): LeadDetailFocus {
  return ACTION_CONFIG[key].focus
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
