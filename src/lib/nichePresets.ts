import type { NichePreset } from '@/domain/lead'
import { DEFAULT_NICHE_PRESETS, USER_NICHE_PRESETS } from './constants'

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
