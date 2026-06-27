import type {
  Lead,
  CreateLeadInput,
  UpdateLeadInput,
  LeadFilters,
  LeadSort,
  ImportResult,
  LeadDuplicateCriteria,
} from '@/domain/lead'
import type { ILeadRepository } from '@/repositories/interfaces/ILeadRepository'
import { STORAGE_KEYS } from '@/lib/constants'
import { formatNicheDisplay, nicheMatches } from '@/lib/nicheDisplay'
import { getStorageItem, setStorageItem } from '@/lib/storage'
import {
  createLeadEntity,
  updateLeadEntity,
  normalizeLeadEntity,
} from '@/domain/leadFactory'
import { appendComment } from '@/domain/leadComments'
import { createDemoLeads } from '@/features/demo/demoLeads'
import { IN_PROGRESS_STATUSES } from '@/features/leads/leadFilters'
import { findMatchingLeads } from '@/lib/leadDuplicates'
import { computeLeadScore, matchesPotentialFilter } from '@/lib/leadScore'

export class LocalStorageLeadRepository implements ILeadRepository {
  private getLeads(): Lead[] {
    return getStorageItem<Lead[]>(STORAGE_KEYS.LEADS, []).map(normalizeLeadEntity)
  }

  private saveLeads(leads: Lead[]): void {
    setStorageItem(STORAGE_KEYS.LEADS, leads)
  }

  async getAll(): Promise<Lead[]> {
    return this.getLeads()
  }

  async getById(id: string): Promise<Lead | null> {
    return this.getLeads().find((l) => l.id === id) ?? null
  }

  async create(input: CreateLeadInput): Promise<Lead> {
    const lead = createLeadEntity(input)
    const leads = this.getLeads()
    leads.unshift(lead)
    this.saveLeads(leads)
    return lead
  }

  async update(id: string, input: UpdateLeadInput): Promise<Lead> {
    const leads = this.getLeads()
    const index = leads.findIndex((l) => l.id === id)
    if (index === -1) throw new Error(`Lead ${id} not found`)
    const updated = updateLeadEntity(leads[index], input)
    leads[index] = updated
    this.saveLeads(leads)
    return updated
  }

  async delete(id: string): Promise<void> {
    const leads = this.getLeads().filter((l) => l.id !== id)
    this.saveLeads(leads)
  }

  async findFiltered(filters: LeadFilters, sort: LeadSort): Promise<Lead[]> {
    let leads = [...this.getLeads()]

    if (filters.search) {
      const q = filters.search.toLowerCase()
      leads = leads.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.niche.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q) ||
          l.website?.toLowerCase().includes(q) ||
          l.contacts.email?.toLowerCase().includes(q) ||
          l.contacts.phone?.toLowerCase().includes(q) ||
          l.contacts.telegram?.toLowerCase().includes(q) ||
          l.contacts.vk?.toLowerCase().includes(q) ||
          l.tags.some((t) => t.toLowerCase().includes(q)),
      )
    }

    if (filters.status === 'in_progress') {
      leads = leads.filter((l) => IN_PROGRESS_STATUSES.includes(l.status))
    } else if (filters.status === 'client') {
      leads = leads.filter((l) => l.status === 'won')
    } else if (filters.status !== 'all') {
      leads = leads.filter((l) => l.status === filters.status)
    }

    if (filters.niche) {
      leads = leads.filter((l) => nicheMatches(l.niche, filters.niche))
    }

    if (filters.source !== 'all') {
      leads = leads.filter((l) => l.source === filters.source)
    }

    if (filters.tags.length > 0) {
      leads = leads.filter((l) =>
        filters.tags.every((tag) => l.tags.includes(tag)),
      )
    }

    if (filters.potential !== 'all') {
      leads = leads.filter((l) => matchesPotentialFilter(l, filters.potential))
    }

    leads.sort((a, b) => {
      const dir = sort.direction === 'asc' ? 1 : -1
      switch (sort.field) {
        case 'name':
          return a.name.localeCompare(b.name, 'ru') * dir
        case 'status':
          return a.status.localeCompare(b.status) * dir
        case 'niche':
          return formatNicheDisplay(a.niche).localeCompare(formatNicheDisplay(b.niche), 'ru') * dir
        case 'updatedAt':
          return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * dir
        case 'potential':
          return (computeLeadScore(a).score - computeLeadScore(b).score) * dir
        case 'createdAt':
        default:
          return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir
      }
    })

    return leads
  }

  async findDuplicates(criteria: LeadDuplicateCriteria): Promise<Lead[]> {
    return findMatchingLeads(this.getLeads(), criteria)
  }

  async importLeads(newLeads: Lead[]): Promise<ImportResult> {
    const existing = this.getLeads()
    const result: ImportResult = { imported: 0, skipped: 0, errors: [] }

    for (const lead of newLeads) {
      try {
        const duplicates = await this.findDuplicates({
          website: lead.website,
          sourceUrl: lead.sourceUrl,
          email: lead.contacts.email,
          phone: lead.contacts.phone,
        })
        if (duplicates.length > 0) {
          result.skipped++
          continue
        }
        existing.unshift(lead)
        result.imported++
      } catch (e) {
        result.errors.push(
          e instanceof Error ? e.message : 'Unknown import error',
        )
      }
    }

    this.saveLeads(existing)
    return result
  }

  async replaceAll(leads: Lead[]): Promise<void> {
    this.saveLeads(leads.map(normalizeLeadEntity))
  }

  async seedDemoLeads(): Promise<ImportResult> {
    const existing = this.getLeads()
    if (existing.length > 0) {
      return {
        imported: 0,
        skipped: existing.length,
        errors: ['База лидов уже содержит записи'],
      }
    }

    const demoLeads = createDemoLeads().map(normalizeLeadEntity)
    this.saveLeads(demoLeads)

    return {
      imported: demoLeads.length,
      skipped: 0,
      errors: [],
    }
  }

  async addComment(id: string, text: string): Promise<Lead> {
    const leads = this.getLeads()
    const index = leads.findIndex((l) => l.id === id)
    if (index === -1) throw new Error(`Lead ${id} not found`)
    const updated = appendComment(leads[index], text)
    leads[index] = updated
    this.saveLeads(leads)
    return updated
  }
}
