import type { AppSettings, NichePreset } from '@/domain/lead'
import type { ISettingsRepository } from '@/repositories/interfaces/ISettingsRepository'
import { STORAGE_KEYS } from '@/lib/constants'
import { buildInitialNichePresets } from '@/lib/nichePresets'
import { getStorageItem, setStorageItem } from '@/lib/storage'
import { generateId } from '@/lib/utils'

function createDefaultSettings(): AppSettings {
  return {
    profile: { name: '', businessType: '' },
    nichePresets: buildInitialNichePresets(),
    plan: 'free',
    integrations: { googleSheetsConnected: false },
  }
}

export class LocalStorageSettingsRepository implements ISettingsRepository {
  async get(): Promise<AppSettings> {
    return getStorageItem<AppSettings>(STORAGE_KEYS.SETTINGS, createDefaultSettings())
  }

  async save(settings: AppSettings): Promise<void> {
    setStorageItem(STORAGE_KEYS.SETTINGS, settings)
  }

  async reset(): Promise<AppSettings> {
    const defaults = createDefaultSettings()
    await this.save(defaults)
    return defaults
  }

  async addNichePreset(name: string, description?: string): Promise<NichePreset> {
    const settings = await this.get()
    const preset: NichePreset = {
      id: generateId(),
      name,
      description,
      isDefault: false,
    }
    settings.nichePresets.push(preset)
    await this.save(settings)
    return preset
  }

  async removeNichePreset(id: string): Promise<void> {
    const settings = await this.get()
    settings.nichePresets = settings.nichePresets.filter((p) => p.id !== id)
    await this.save(settings)
  }
}
