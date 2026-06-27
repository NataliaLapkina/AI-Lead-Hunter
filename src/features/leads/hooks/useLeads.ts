import { useCallback, useEffect, useState } from 'react'
import type {
  Lead,
  CreateLeadInput,
  UpdateLeadInput,
  LeadFilters,
  LeadSort,
  ImportResult,
  LeadDuplicateCriteria,
} from '@/domain/lead'
import { DEFAULT_LEAD_FILTERS } from '@/features/leads/leadFilters'
import { repositories } from '@/repositories'
import { useLeadStore } from '@/stores'
import {
  filterOverdueLeads,
  sortLeadsByOverdueDays,
} from '@/lib/leadAttention'

const defaultFilters: LeadFilters = DEFAULT_LEAD_FILTERS

const defaultSort: LeadSort = {
  field: 'createdAt',
  direction: 'desc',
}

export function useLeads() {
  const { leads, isLoading, fetchLeads, refreshLeads } = useLeadStore()
  const [filters, setFilters] = useState<LeadFilters>(defaultFilters)
  const [sort, setSort] = useState<LeadSort>(defaultSort)
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  useEffect(() => {
    repositories.leads.findFiltered(filters, sort).then((results) => {
      if (filters.attention === 'overdue') {
        const overdueLeads = sortLeadsByOverdueDays(filterOverdueLeads(results))
        setFilteredLeads(overdueLeads)
        return
      }

      setFilteredLeads(results)
    })
  }, [leads, filters, sort])

  const createLead = useCallback(
    async (input: CreateLeadInput) => {
      const lead = await repositories.leads.create(input)
      await refreshLeads()
      return lead
    },
    [refreshLeads],
  )

  const updateLead = useCallback(
    async (id: string, input: UpdateLeadInput) => {
      const lead = await repositories.leads.update(id, input)
      await refreshLeads()
      return lead
    },
    [refreshLeads],
  )

  const deleteLead = useCallback(
    async (id: string) => {
      await repositories.leads.delete(id)
      await refreshLeads()
    },
    [refreshLeads],
  )

  const updateStatus = useCallback(
    async (id: string, status: Lead['status']) => {
      return updateLead(id, { status })
    },
    [updateLead],
  )

  const checkDuplicates = useCallback(
    async (criteria: LeadDuplicateCriteria) => {
      return repositories.leads.findDuplicates(criteria)
    },
    [],
  )

  const importLeads = useCallback(
    async (newLeads: Lead[]): Promise<ImportResult> => {
      const result = await repositories.leads.importLeads(newLeads)
      await refreshLeads()
      return result
    },
    [refreshLeads],
  )

  const loadDemoLeads = useCallback(async (): Promise<ImportResult> => {
    const result = await repositories.leads.seedDemoLeads()
    await refreshLeads()
    return result
  }, [refreshLeads])

  const addComment = useCallback(
    async (id: string, text: string) => {
      await repositories.leads.addComment(id, text)
      await refreshLeads()
    },
    [refreshLeads],
  )

  return {
    leads,
    filteredLeads,
    isLoading,
    filters,
    setFilters,
    sort,
    setSort,
    createLead,
    updateLead,
    deleteLead,
    updateStatus,
    checkDuplicates,
    importLeads,
    loadDemoLeads,
    addComment,
    refreshLeads,
  }
}

export function useLead(id: string | null) {
  const { leads } = useLeadStore()
  return id ? leads.find((l) => l.id === id) ?? null : null
}
