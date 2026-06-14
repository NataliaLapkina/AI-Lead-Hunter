import type { ILeadRepository } from '@/repositories/interfaces/ILeadRepository'
import type { ISearchQueryRepository } from '@/repositories/interfaces/ISearchQueryRepository'
import type { ISettingsRepository } from '@/repositories/interfaces/ISettingsRepository'
import { LocalStorageLeadRepository } from '@/repositories/local/LocalStorageLeadRepository'
import { LocalStorageSearchQueryRepository } from '@/repositories/local/LocalStorageSearchQueryRepository'
import { LocalStorageSettingsRepository } from '@/repositories/local/LocalStorageSettingsRepository'

export interface Repositories {
  leads: ILeadRepository
  searchQueries: ISearchQueryRepository
  settings: ISettingsRepository
}

export function createRepositories(): Repositories {
  return {
    leads: new LocalStorageLeadRepository(),
    searchQueries: new LocalStorageSearchQueryRepository(),
    settings: new LocalStorageSettingsRepository(),
  }
}

export const repositories = createRepositories()
