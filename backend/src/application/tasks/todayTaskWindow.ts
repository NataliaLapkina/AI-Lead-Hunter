import { DateTime, IANAZone } from 'luxon'

export type TodayTaskWindow = {
  startOfToday: Date
  startOfTomorrow: Date
}

export function isValidIanaTimeZone(timeZone: string): boolean {
  return IANAZone.isValidZone(timeZone)
}

export function resolveTodayTaskWindow(
  now: Date,
  timeZone: string,
): TodayTaskWindow {
  const zonedNow = DateTime.fromJSDate(now, { zone: timeZone })
  if (!zonedNow.isValid) {
    throw new Error(`Unable to resolve today window for timezone "${timeZone}".`)
  }

  const startOfToday = zonedNow.startOf('day')
  const startOfTomorrow = zonedNow.plus({ days: 1 }).startOf('day')

  if (
    !startOfToday.isValid ||
    !startOfTomorrow.isValid ||
    startOfTomorrow.toMillis() <= startOfToday.toMillis()
  ) {
    throw new Error(`Unable to resolve today window for timezone "${timeZone}".`)
  }

  return {
    startOfToday: startOfToday.toJSDate(),
    startOfTomorrow: startOfTomorrow.toJSDate(),
  }
}
