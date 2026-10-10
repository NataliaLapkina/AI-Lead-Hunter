export class MissingTimeZoneError extends Error {
  constructor() {
    super('Browser timezone is unavailable.')
    this.name = 'MissingTimeZoneError'
  }
}

export function readBrowserTimeZone(
  resolve: () => string | undefined = () =>
    Intl.DateTimeFormat().resolvedOptions().timeZone,
): string | null {
  let resolved: string | undefined
  try {
    resolved = resolve()
  } catch {
    return null
  }

  if (typeof resolved !== 'string') {
    return null
  }

  const timeZone = resolved.trim()
  if (timeZone.length === 0) {
    return null
  }

  try {
    Intl.DateTimeFormat('en-US', { timeZone })
  } catch {
    return null
  }

  return timeZone
}
