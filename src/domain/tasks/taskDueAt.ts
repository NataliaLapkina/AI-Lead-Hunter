const RFC3339_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|([+-])(\d{2}):(\d{2}))$/i

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

export function formatLocalYmd(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function isSameLocalDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function toFutureRfc3339(date: Date, now: Date): string | null {
  if (date.getTime() <= now.getTime()) {
    return null
  }

  const iso = date.toISOString()
  return RFC3339_DATE_TIME.test(iso) ? iso : null
}

function parseLocalDateInput(
  value: string,
): { year: number; month: number; day: number } | null {
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

export function dueAtToday(now = new Date()): string | null {
  const due = new Date(now.getTime() + 60 * 60 * 1000)
  due.setSeconds(0, 0)

  if (!isSameLocalDay(due, now)) {
    return null
  }

  return toFutureRfc3339(due, now)
}

export function isTodayDueAtAvailable(now = new Date()): boolean {
  return dueAtToday(now) !== null
}

export function dueAtTomorrow(now = new Date()): string | null {
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    9,
    0,
    0,
    0,
  )

  return toFutureRfc3339(tomorrow, now)
}

export function dueAtCustomDate(dateInput: string, now = new Date()): string | null {
  const parsed = parseLocalDateInput(dateInput)
  if (!parsed) {
    return null
  }

  const local = new Date(parsed.year, parsed.month - 1, parsed.day, 9, 0, 0, 0)

  if (
    local.getFullYear() !== parsed.year ||
    local.getMonth() !== parsed.month - 1 ||
    local.getDate() !== parsed.day ||
    local.getHours() !== 9
  ) {
    return null
  }

  return toFutureRfc3339(local, now)
}

export function getTaskDateInputMin(now = new Date()): string {
  const todayAtNine = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    9,
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
    9,
    0,
    0,
    0,
  )

  return formatLocalYmd(tomorrow)
}
