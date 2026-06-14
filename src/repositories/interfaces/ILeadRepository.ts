import type {
  Lead,
  CreateLeadInput,
  UpdateLeadInput,
  LeadFilters,
  LeadSort,
  ImportResult,
} from '@/domain/lead'

export interface ILeadRepository {
  getAll(): Promise<Lead[]>
  getById(id: string): Promise<Lead | null>
  create(input: CreateLeadInput): Promise<Lead>
  update(id: string, input: UpdateLeadInput): Promise<Lead>
  delete(id: string): Promise<void>
  findFiltered(filters: LeadFilters, sort: LeadSort): Promise<Lead[]>
  findDuplicates(website?: string, email?: string): Promise<Lead[]>
  importLeads(leads: Lead[]): Promise<ImportResult>
  replaceAll(leads: Lead[]): Promise<void>
  addComment(id: string, text: string): Promise<Lead>
}
