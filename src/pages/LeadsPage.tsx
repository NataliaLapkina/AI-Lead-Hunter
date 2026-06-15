import { useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { UserPlus, Download, Upload, Users } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { LeadFiltersBar } from '@/components/leads/LeadFilters'
import { LeadTable } from '@/components/leads/LeadTable'
import { LeadDetailSheet } from '@/components/leads/LeadDetailSheet'
import { LeadForm } from '@/components/leads/LeadForm'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { useLeads, useLead } from '@/features/leads/hooks/useLeads'
import {
  buildLeadSearchParams,
  mergeLeadFiltersFromSearchParams,
} from '@/features/leads/leadFilters'
import { useUIStore } from '@/stores'
import { getUniqueNiches, getUniqueTags } from '@/features/analytics/computeAnalytics'
import { exportLeadsToCsv, getCsvFilename } from '@/features/export/csvExporter'
import { parseLeadsFromJson } from '@/features/export/jsonExporter'
import { downloadBlob } from '@/lib/utils'
import { ru, t } from '@/i18n/ru'
import { toast } from 'sonner'
import type { CreateLeadInput, Lead } from '@/domain/lead'
import { computeLeadNextAction } from '@/lib/leadNextAction'

export function LeadsPage() {
  const {
    leads,
    filteredLeads,
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
    addComment,
  } = useLeads()

  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    setFilters(mergeLeadFiltersFromSearchParams(searchParams))
  }, [searchParams, setFilters])

  const handleFiltersChange: typeof setFilters = (nextFilters) => {
    setFilters((current) => {
      const updated = typeof nextFilters === 'function' ? nextFilters(current) : nextFilters
      setSearchParams(buildLeadSearchParams(updated), { replace: true })
      return updated
    })
  }

  const {
    selectedLeadId,
    isLeadSheetOpen,
    isLeadFormOpen,
    editingLeadId,
    openLeadSheet,
    closeLeadSheet,
    openLeadForm,
    closeLeadForm,
    leadDetailFocus,
    leadDetailFocusSeq,
  } = useUIStore()

  const selectedLead = useLead(selectedLeadId)
  const editingLead = useLead(editingLeadId)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const niches = getUniqueNiches(leads)
  const tags = getUniqueTags(leads)

  const handleExportCsv = () => {
    const blob = exportLeadsToCsv(filteredLeads)
    downloadBlob(blob, getCsvFilename())
    toast.success(t('leads.exportSuccess', { count: filteredLeads.length }))
  }

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const { leads: parsed, errors } = await parseLeadsFromJson(file)
    if (errors.length > 0 && parsed.length === 0) {
      toast.error(errors[0])
      return
    }

    const result = await importLeads(parsed)
    toast.success(
      t('leads.imported', { count: result.imported }) +
        (result.skipped > 0 ? `. ${t('leads.skipped', { count: result.skipped })}` : ''),
    )

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleNextAction = (lead: Lead) => {
    const action = computeLeadNextAction(lead)
    openLeadSheet(lead.id, action.focus)
  }

  const handleCreateLead = async (data: CreateLeadInput) => {
    await createLead(data)
    toast.success(ru.toast.leadCreated)
  }

  const handleUpdateLead = async (data: CreateLeadInput) => {
    if (!editingLeadId) return
    await updateLead(editingLeadId, data)
    toast.success(ru.toast.leadUpdated)
  }

  return (
    <>
      <AppShell
        title={ru.leads.title}
        subtitle={ru.leads.subtitle}
        actions={
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportJson}
            />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">{ru.leads.importJson}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={filteredLeads.length === 0} className="gap-2">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{ru.leads.exportCsv}</span>
            </Button>
            <Button size="sm" onClick={() => openLeadForm()} className="gap-2">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">{ru.leads.addLead}</span>
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <LeadFiltersBar
            filters={filters}
            onFiltersChange={handleFiltersChange}
            sort={sort}
            onSortChange={setSort}
            niches={niches}
            tags={tags}
          />

          {leads.length === 0 ? (
            <EmptyState
              icon={<Users className="h-10 w-10" />}
              title={ru.leads.emptyTitle}
              description={ru.leads.emptyDescription}
              actionLabel={ru.leads.addLead}
              onAction={() => openLeadForm()}
            />
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {filters.attention === 'overdue'
                  ? t('leads.overdueShown', { count: filteredLeads.length })
                  : `Показано ${filteredLeads.length} из ${leads.length}`}
              </p>
              {filteredLeads.length === 0 ? (
                <EmptyState
                  title={ru.common.noResults}
                  description="Попробуйте изменить параметры фильтрации"
                />
              ) : (
                <LeadTable
                  leads={filteredLeads}
                  onRowClick={openLeadSheet}
                  onNextActionClick={handleNextAction}
                  onStatusChange={async (id, status) => {
                    await updateStatus(id, status)
                    toast.success(ru.toast.statusChanged)
                  }}
                />
              )}
            </>
          )}
        </div>
      </AppShell>

      <LeadDetailSheet
        lead={selectedLead}
        open={isLeadSheetOpen}
        onOpenChange={(open) => !open && closeLeadSheet()}
        onStatusChange={async (id, status) => {
          await updateStatus(id, status)
          toast.success(ru.toast.statusChanged)
        }}
        onEdit={(id) => {
          closeLeadSheet()
          openLeadForm(id)
        }}
        onDelete={async (id) => {
          await deleteLead(id)
          toast.success(ru.toast.leadDeleted)
        }}
        onUpdateLead={updateLead}
        onAddComment={addComment}
        focus={leadDetailFocus}
        focusSeq={leadDetailFocusSeq}
      />

      <LeadForm
        open={isLeadFormOpen}
        onOpenChange={(open) => !open && closeLeadForm()}
        lead={editingLeadId ? editingLead : null}
        onSubmit={editingLeadId ? handleUpdateLead : handleCreateLead}
        onCheckDuplicates={checkDuplicates}
      />
    </>
  )
}
