import { useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { AutoSearchForm } from '@/components/search/AutoSearchForm'
import { AutoSearchPreviewTable } from '@/components/search/AutoSearchPreviewTable'
import { AutoSearchDraftSheet } from '@/components/search/AutoSearchDraftSheet'
import { useLeads } from '@/features/leads/hooks/useLeads'
import { useSettingsStore } from '@/stores'
import {
  draftToCreateLeadInput,
  runAutoLeadSearch,
} from '@/services/search/autoLeadSearchService'
import { createLeadEntity } from '@/domain/leadFactory'
import { ru } from '@/i18n/ru'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { AutoSearchDraftLead, AutoSearchParams } from '@/domain/lead'

export function AutoSearchPage() {
  const { importLeads } = useLeads()
  const { settings } = useSettingsStore()
  const [drafts, setDrafts] = useState<AutoSearchDraftLead[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingDraft, setEditingDraft] = useState<AutoSearchDraftLead | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleSearch = async (params: AutoSearchParams) => {
    setIsSearching(true)
    try {
      await new Promise((r) => setTimeout(r, 400))
      const results = runAutoLeadSearch(params, settings?.profile, settings?.aiSettings)
      setDrafts(results)
    } finally {
      setIsSearching(false)
    }
  }

  const handleToggleSelect = (id: string) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, selected: !d.selected } : d)),
    )
  }

  const handleToggleSelectAll = (selected: boolean) => {
    setDrafts((prev) => prev.map((d) => ({ ...d, selected })))
  }

  const handleDelete = (id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id))
  }

  const handleEdit = (draft: AutoSearchDraftLead) => {
    setEditingDraft(draft)
    setSheetOpen(true)
  }

  const handleSaveDraft = (updated: AutoSearchDraftLead) => {
    setDrafts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
  }

  const handleSaveSelected = async () => {
    const selected = drafts.filter((d) => d.selected)
    if (selected.length === 0) {
      toast.error(ru.autoSearch.noSelected)
      return
    }

    setIsSaving(true)
    try {
      const leads = selected.map((draft) =>
        createLeadEntity(draftToCreateLeadInput(draft)),
      )
      const result = await importLeads(leads)
      toast.success(
        ru.autoSearch.saveSuccess
          .replace('{imported}', String(result.imported))
          .replace('{skipped}', String(result.skipped)),
      )
      const savedIds = new Set(selected.map((d) => d.id))
      setDrafts((prev) => prev.filter((d) => !savedIds.has(d.id)))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : ru.toast.error)
    } finally {
      setIsSaving(false)
    }
  }

  const selectedCount = drafts.filter((d) => d.selected).length

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <AutoSearchForm onSearch={handleSearch} isSearching={isSearching} />

      <AutoSearchPreviewTable
        drafts={drafts}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {drafts.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={() => void handleSaveSelected()}
            disabled={isSaving || selectedCount === 0}
            className="gap-2"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {ru.autoSearch.saveSelected.replace('{count}', String(selectedCount))}
          </Button>
        </div>
      )}

      <AutoSearchDraftSheet
        draft={editingDraft}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSave={handleSaveDraft}
      />
    </div>
  )
}
