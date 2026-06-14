import type { SearchQuery } from '@/domain/lead'
import type { ISearchQueryRepository } from '@/repositories/interfaces/ISearchQueryRepository'
import { STORAGE_KEYS } from '@/lib/constants'
import { getStorageItem, setStorageItem } from '@/lib/storage'

export class LocalStorageSearchQueryRepository implements ISearchQueryRepository {
  private getQueries(): SearchQuery[] {
    return getStorageItem<SearchQuery[]>(STORAGE_KEYS.QUERIES, [])
  }

  private saveQueries(queries: SearchQuery[]): void {
    setStorageItem(STORAGE_KEYS.QUERIES, queries)
  }

  async getAll(): Promise<SearchQuery[]> {
    return this.getQueries()
  }

  async save(queries: SearchQuery[]): Promise<void> {
    this.saveQueries(queries)
  }

  async add(query: SearchQuery): Promise<void> {
    const queries = this.getQueries()
    queries.unshift(query)
    this.saveQueries(queries.slice(0, 100))
  }

  async clear(): Promise<void> {
    this.saveQueries([])
  }
}
