import { SCHEMA_VERSION, STORAGE_KEYS } from './constants'

export function getStorageItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export function removeStorageItem(key: string): void {
  localStorage.removeItem(key)
}

export function getSchemaVersion(): number {
  return getStorageItem<number>(STORAGE_KEYS.SCHEMA_VERSION, 0)
}

export function setSchemaVersion(version: number): void {
  setStorageItem(STORAGE_KEYS.SCHEMA_VERSION, version)
}

export function ensureSchemaVersion(): void {
  const current = getSchemaVersion()
  if (current < SCHEMA_VERSION) {
    setSchemaVersion(SCHEMA_VERSION)
  }
}

export function clearAllAppData(): void {
  Object.values(STORAGE_KEYS).forEach(removeStorageItem)
}
