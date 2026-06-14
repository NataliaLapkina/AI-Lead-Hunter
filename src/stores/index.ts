import type { Lead } from '@/domain/lead'
import type { AppSettings } from '@/domain/lead'
import type { LeadDetailFocus } from '@/lib/leadNextAction'
import { repositories } from '@/repositories'
import { create } from 'zustand'

interface LeadStore {
  leads: Lead[]
  isLoading: boolean
  error: string | null
  fetchLeads: () => Promise<void>
  refreshLeads: () => Promise<void>
}

export const useLeadStore = create<LeadStore>((set) => ({
  leads: [],
  isLoading: false,
  error: null,

  fetchLeads: async () => {
    set({ isLoading: true, error: null })
    try {
      const leads = await repositories.leads.getAll()
      set({ leads, isLoading: false })
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : 'Failed to load leads',
        isLoading: false,
      })
    }
  },

  refreshLeads: async () => {
    const leads = await repositories.leads.getAll()
    set({ leads })
  },
}))

interface SettingsStore {
  settings: AppSettings | null
  isLoading: boolean
  fetchSettings: () => Promise<void>
  updateSettings: (settings: AppSettings) => Promise<void>
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: null,
  isLoading: false,

  fetchSettings: async () => {
    set({ isLoading: true })
    const settings = await repositories.settings.get()
    set({ settings, isLoading: false })
  },

  updateSettings: async (settings) => {
    await repositories.settings.save(settings)
    const saved = await repositories.settings.get()
    set({ settings: saved })
  },
}))

interface UIStore {
  selectedLeadId: string | null
  isLeadSheetOpen: boolean
  isLeadFormOpen: boolean
  editingLeadId: string | null
  leadDetailFocus: LeadDetailFocus | null
  leadDetailFocusSeq: number
  openLeadSheet: (id: string, focus?: LeadDetailFocus) => void
  closeLeadSheet: () => void
  openLeadForm: (id?: string) => void
  closeLeadForm: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  selectedLeadId: null,
  isLeadSheetOpen: false,
  isLeadFormOpen: false,
  editingLeadId: null,
  leadDetailFocus: null,
  leadDetailFocusSeq: 0,

  openLeadSheet: (id, focus) =>
    set((state) => ({
      selectedLeadId: id,
      isLeadSheetOpen: true,
      leadDetailFocus: focus ?? null,
      leadDetailFocusSeq: focus ? state.leadDetailFocusSeq + 1 : state.leadDetailFocusSeq,
    })),
  closeLeadSheet: () =>
    set({
      selectedLeadId: null,
      isLeadSheetOpen: false,
      leadDetailFocus: null,
    }),
  openLeadForm: (id) =>
    set({ editingLeadId: id ?? null, isLeadFormOpen: true }),
  closeLeadForm: () => set({ editingLeadId: null, isLeadFormOpen: false }),
}))
