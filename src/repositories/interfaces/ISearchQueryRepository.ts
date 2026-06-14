import type { SearchQuery } from '@/domain/lead'

export interface ISearchQueryRepository {
  getAll(): Promise<SearchQuery[]>
  save(queries: SearchQuery[]): Promise<void>
  add(query: SearchQuery): Promise<void>
  clear(): Promise<void>
}
