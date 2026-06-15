import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns'
import type { Lead } from '@/domain/lead'
import type { NextActionKey } from '@/lib/leadNextActionTypes'
import { formatDate } from '@/lib/utils'

export const NEXT_ACTION_SLA_DAYS: Partial<Record<NextActionKey, number>> = {
  prepare_lead: 0,
  send_first_message: 0,
  wait_for_reply: 3,
  follow_up: 7,
  prepare_proposal: 3,
}

export interface NextActionDeadline {
  dueAt: string | null
  isOverdue: boolean
  overdueDays: number
  recommendedDeadline: string | null
}

function pluralizeDays(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod100 >= 11 && mod100 <= 14) return 'дней'
  if (mod10 === 1) return 'день'
  if (mod10 >= 2 && mod10 <= 4) return 'дня'
  return 'дней'
}

export function getStatusEnteredAt(lead: Lead): Date {
  const statusChanges = lead.activityLog
    .filter(
      (activity) =>
        activity.type === 'status_change' && activity.payload.to === lead.status,
    )
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )

  if (statusChanges.length > 0) {
    return new Date(statusChanges[0].timestamp)
  }

  return new Date(lead.updatedAt || lead.createdAt)
}

export function computeNextActionDeadline(
  lead: Lead,
  actionKey: NextActionKey,
  referenceDate: Date = new Date(),
): NextActionDeadline {
  const slaDays = NEXT_ACTION_SLA_DAYS[actionKey]

  if (slaDays === undefined) {
    return {
      dueAt: null,
      isOverdue: false,
      overdueDays: 0,
      recommendedDeadline: null,
    }
  }

  const enteredAt = getStatusEnteredAt(lead)
  const dueDate = addDays(startOfDay(enteredAt), slaDays)
  const today = startOfDay(referenceDate)
  const daysFromDue = differenceInCalendarDays(today, dueDate)
  const isOverdue = daysFromDue > 0

  let recommendedDeadline: string
  if (isOverdue) {
    recommendedDeadline = `Просрочено на ${daysFromDue} ${pluralizeDays(daysFromDue)}`
  } else if (daysFromDue === 0) {
    recommendedDeadline = 'Сегодня'
  } else {
    recommendedDeadline = `До ${formatDate(dueDate)}`
  }

  return {
    dueAt: dueDate.toISOString(),
    isOverdue,
    overdueDays: isOverdue ? daysFromDue : 0,
    recommendedDeadline,
  }
}
