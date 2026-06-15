import type { AppSettings, NichePreset } from '@/domain/lead'
import { DEFAULT_NICHE_PRESETS, USER_NICHE_PRESETS } from './constants'
import { normalizeNicheName } from './nicheDisplay'
import { normalizeAppProfile } from './senderProfile'
import { normalizeAISettings } from './aiMessageSettings'
import { normalizeAIProfile } from './aiProfile'

const DEFAULT_NICHE_IDS = new Set<string>(DEFAULT_NICHE_PRESETS.map((n) => n.id))

export function createDefaultNichePresets(): NichePreset[] {
  return DEFAULT_NICHE_PRESETS.map((n) => ({
    id: n.id,
    name: n.name,
    description: n.description,
    isDefault: true,
  }))
}

export function createUserNichePresets(): NichePreset[] {
  return USER_NICHE_PRESETS.map((n) => ({
    id: n.id,
    name: n.name,
    description: n.description,
    isDefault: false,
  }))
}

export function buildInitialNichePresets(): NichePreset[] {
  return [...createDefaultNichePresets(), ...createUserNichePresets()]
}

/** Восстанавливает isDefault и гарантирует наличие базовых ниш */
export function normalizeNichePresets(presets: NichePreset[] | undefined | null): NichePreset[] {
  if (!presets?.length) {
    return buildInitialNichePresets()
  }

  const normalized = presets.map((p) => ({
    ...p,
    name: normalizeNicheName((p.name ?? '').trim() || p.id),
    isDefault: DEFAULT_NICHE_IDS.has(p.id),
  }))

  for (const def of createDefaultNichePresets()) {
    if (!normalized.some((p) => p.id === def.id)) {
      normalized.unshift(def)
    }
  }

  return normalized
}

/** Ниши для блока «Популярные ниши» на странице Поиск */
export function getSearchNichePresets(presets: NichePreset[]): NichePreset[] {
  const sorted = [...presets].sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1
    return a.name.localeCompare(b.name, 'ru')
  })

  const seen = new Set<string>()
  return sorted.filter((p) => {
    const key = p.name.trim().toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function normalizeAppSettings(
  raw: Partial<AppSettings> | null,
  fallback: AppSettings,
): AppSettings {
  if (!raw) return fallback

  return {
    ...fallback,
    ...raw,
    profile: normalizeAppProfile(raw.profile, fallback.profile),
    integrations: {
      ...fallback.integrations,
      ...raw.integrations,
    },
    nichePresets: normalizeNichePresets(raw.nichePresets),
    aiSettings: normalizeAISettings(raw.aiSettings, fallback.aiSettings),
    aiProfile: normalizeAIProfile(raw.aiProfile, fallback.aiProfile),
  }
}
