import type { AppSettings, NichePreset } from '@/domain/lead'
import type { ISettingsRepository } from '@/repositories/interfaces/ISettingsRepository'
import { STORAGE_KEYS } from '@/lib/constants'
import { buildInitialNichePresets, normalizeAppSettings } from '@/lib/nichePresets'
import { normalizeNicheName } from '@/lib/nicheDisplay'
import { createDefaultAppProfile } from '@/lib/senderProfile'
import { getStorageItem, setStorageItem } from '@/lib/storage'
import { generateId } from '@/lib/utils'

function createDefaultSettings(): AppSettings {
  return {
    profile: createDefaultAppProfile(),
    nichePresets: buildInitialNichePresets(),
    plan: 'free',
    integrations: { googleSheetsConnected: false },
  }
}

export class LocalStorageSettingsRepository implements ISettingsRepository {
  async get(): Promise<AppSettings> {
    const fallback = createDefaultSettings()
    const raw = getStorageItem<AppSettings | null>(STORAGE_KEYS.SETTINGS, null)
    return normalizeAppSettings(raw, fallback)
  }

  async save(settings: AppSettings): Promise<void> {
    const normalized = normalizeAppSettings(settings, createDefaultSettings())
    setStorageItem(STORAGE_KEYS.SETTINGS, normalized)
  }

  async reset(): Promise<AppSettings> {
    const defaults = createDefaultSettings()
    await this.save(defaults)
    return defaults
  }

  async addNichePreset(name: string, description?: string): Promise<NichePreset> {
    const trimmed = normalizeNicheName(name)
    if (!trimmed) {
      throw new Error('Укажите название ниши')
    }

    const settings = await this.get()
    const exists = settings.nichePresets.some(
      (p) => p.name.trim().toLowerCase() === trimmed.toLowerCase(),
    )
    if (exists) {
      throw new Error('Такая ниша уже есть в списке')
    }

    const preset: NichePreset = {
      id: generateId(),
      name: trimmed,
      description,
      isDefault: false,
    }
    await this.save({
      ...settings,
      nichePresets: [...settings.nichePresets, preset],
    })
    return preset
  }

  async removeNichePreset(id: string): Promise<void> {
    const settings = await this.get()
    const preset = settings.nichePresets.find((p) => p.id === id)
    if (!preset || preset.isDefault) {
      return
    }
    await this.save({
      ...settings,
      nichePresets: settings.nichePresets.filter((p) => p.id !== id),
    })
  }
}
