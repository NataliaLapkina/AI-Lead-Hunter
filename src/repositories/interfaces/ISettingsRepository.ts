import type { AppSettings } from '@/domain/lead'

export interface ISettingsRepository {
  get(): Promise<AppSettings>
  save(settings: AppSettings): Promise<void>
  reset(): Promise<AppSettings>
}
