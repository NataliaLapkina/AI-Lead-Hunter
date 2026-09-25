const RFC3339_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|([+-])(\d{2}):(\d{2}))$/i

const LOCAL_SNOOZE_HOUR = 9

export const SNOOZE_PRESET_DAYS = {
  tomorrow: 1,
  inThreeDays: 3,
  inOneWeek: 7,
} as const

export type SnoozePresetKey = keyof typeof SNOOZE_PRESET_DAYS

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function formatLocalYmd(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function parseLocalDateInput(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null
  }

  return { year, month, day }
}

export function isRfc3339DateTime(value: string): boolean {
  return RFC3339_DATE_TIME.test(value)
}

export function toFutureRfc3339(date: Date, now = new Date()): string | null {
  if (date.getTime() <= now.getTime()) {
    return null
  }

  const iso = date.toISOString()
  return isRfc3339DateTime(iso) ? iso : null
}

export function snoozePresetUntil(
  preset: SnoozePresetKey,
  now = new Date(),
): string | null {
  const days = SNOOZE_PRESET_DAYS[preset]
  return toFutureRfc3339(new Date(now.getTime() + days * 24 * 60 * 60 * 1000), now)
}

export function snoozeLocalDateAtNine(dateInput: string): Date | null {
  const parsed = parseLocalDateInput(dateInput)
  if (!parsed) {
    return null
  }

  const local = new Date(
    parsed.year,
    parsed.month - 1,
    parsed.day,
    LOCAL_SNOOZE_HOUR,
    0,
    0,
    0,
  )

  if (
    local.getFullYear() !== parsed.year ||
    local.getMonth() !== parsed.month - 1 ||
    local.getDate() !== parsed.day ||
    local.getHours() !== LOCAL_SNOOZE_HOUR
  ) {
    return null
  }

  return local
}

export function snoozeCustomDateUntil(
  dateInput: string,
  now = new Date(),
): string | null {
  const local = snoozeLocalDateAtNine(dateInput)
  if (!local) {
    return null
  }

  return toFutureRfc3339(local, now)
}

export function getSnoozeDateInputMin(now = new Date()): string {
  const todayAtNine = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    LOCAL_SNOOZE_HOUR,
    0,
    0,
    0,
  )

  if (now.getTime() < todayAtNine.getTime()) {
    return formatLocalYmd(todayAtNine)
  }

  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    LOCAL_SNOOZE_HOUR,
    0,
    0,
    0,
  )

  return formatLocalYmd(tomorrow)
}
