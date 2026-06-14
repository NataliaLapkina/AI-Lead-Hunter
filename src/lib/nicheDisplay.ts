const LOCALE = 'ru-RU'

/** Отображаемое название ниши: первая буква заглавная (Title Case для одного слова). */
export function formatNicheDisplay(niche: string): string {
  const trimmed = niche.trim()
  if (!trimmed) return trimmed
  return trimmed.charAt(0).toLocaleUpperCase(LOCALE) + trimmed.slice(1)
}

/** Нормализация при сохранении — та же логика, что и для UI. */
export function normalizeNicheName(niche: string): string {
  return formatNicheDisplay(niche)
}

export function nicheDisplayKey(niche: string): string {
  return niche.trim().toLowerCase()
}

export function nicheMatches(a: string, b: string): boolean {
  return nicheDisplayKey(a) === nicheDisplayKey(b)
}
