import type { AppSettings, NichePreset } from '@/domain/lead'

export interface ISettingsRepository {
  get(): Promise<AppSettings>
  save(settings: AppSettings): Promise<void>
  reset(): Promise<AppSettings>
  addNichePreset(name: string, description?: string): Promise<NichePreset>
  removeNichePreset(id: string): Promise<void>
}
