import type {
  Lead,
  CreateLeadInput,
  UpdateLeadInput,
  LeadFilters,
  LeadSort,
  ImportResult,
  LeadDuplicateCriteria,
} from '@/domain/lead'

export interface ILeadRepository {
  getAll(): Promise<Lead[]>
  getById(id: string): Promise<Lead | null>
  create(input: CreateLeadInput): Promise<Lead>
  update(id: string, input: UpdateLeadInput): Promise<Lead>
  delete(id: string): Promise<void>
  findFiltered(filters: LeadFilters, sort: LeadSort): Promise<Lead[]>
  findDuplicates(criteria: LeadDuplicateCriteria): Promise<Lead[]>
  importLeads(leads: Lead[]): Promise<ImportResult>
  replaceAll(leads: Lead[]): Promise<void>
  seedDemoLeads(): Promise<ImportResult>
  addComment(id: string, text: string): Promise<Lead>
}
