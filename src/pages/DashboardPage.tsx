import { useNavigate } from 'react-router-dom'
import { Users } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { StatsCards } from '@/components/analytics/StatsCards'
import { QuickActions, RecentLeads, ActionRequired } from '@/components/dashboard/DashboardWidgets'
import { EmptyState } from '@/components/shared/EmptyState'
import { LeadDetailSheet } from '@/components/leads/LeadDetailSheet'
import { LeadForm } from '@/components/leads/LeadForm'
import { useAnalytics } from '@/features/analytics/hooks/useAnalytics'
import { useLeads, useLead } from '@/features/leads/hooks/useLeads'
import { useUIStore } from '@/stores'
import { ru } from '@/i18n/ru'
import { toast } from 'sonner'
import type { CreateLeadInput } from '@/domain/lead'

export function DashboardPage() {
  const navigate = useNavigate()
  const analytics = useAnalytics()
  const { leads, createLead, updateLead, deleteLead, updateStatus, checkDuplicates, addComment } = useLeads()
  const {
    selectedLeadId,
    editingLeadId,
    isLeadSheetOpen,
    isLeadFormOpen,
    openLeadSheet,
    closeLeadSheet,
    openLeadForm,
    closeLeadForm,
    leadDetailFocus,
    leadDetailFocusSeq,
  } = useUIStore()
  const selectedLead = useLead(selectedLeadId)
  const editingLead = useLead(editingLeadId)

  const handleCreateLead = async (data: CreateLeadInput) => {
    await createLead(data)
    toast.success(ru.toast.leadCreated)
  }

  const handleUpdateLead = async (data: CreateLeadInput) => {
    if (!editingLeadId) return
    await updateLead(editingLeadId, data)
    toast.success(ru.toast.leadUpdated)
  }

  const isEmpty = leads.length === 0

  return (
    <>
      <AppShell title={ru.dashboard.title} subtitle={ru.dashboard.subtitle}>
        {isEmpty ? (
          <EmptyState
            icon={<Users className="h-10 w-10" />}
            title={ru.dashboard.emptyTitle}
            description={ru.dashboard.emptyDescription}
            actionLabel={ru.dashboard.newSearch}
            onAction={() => navigate('/search')}
          />
        ) : (
          <div className="space-y-6">
            <StatsCards analytics={analytics} interactive />
            <ActionRequired leads={leads} />
            <div className="grid gap-6 lg:grid-cols-2">
              <QuickActions onAddLead={() => openLeadForm()} />
              <RecentLeads leads={leads} onLeadClick={openLeadSheet} />
            </div>
          </div>
        )}
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
