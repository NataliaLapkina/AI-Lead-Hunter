import { useNavigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { LeadDetailView } from '@/components/leads/LeadDetailView'
import { LeadForm } from '@/components/leads/LeadForm'
import { Button } from '@/components/ui/button'
import { useLeads, useLead } from '@/features/leads/hooks/useLeads'
import { useUIStore } from '@/stores'
import { ru } from '@/i18n/ru'
import { toast } from 'sonner'
import type { CreateLeadInput } from '@/domain/lead'

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const lead = useLead(id ?? null)
  const { isLoading, updateLead, deleteLead, updateStatus, addComment, checkDuplicates } =
    useLeads()
  const { isLeadFormOpen, editingLeadId, openLeadForm, closeLeadForm } = useUIStore()
  const editingLead = useLead(editingLeadId)
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    if (!isLoading) setHasLoaded(true)
  }, [isLoading])

  if (!hasLoaded || isLoading) {
    return (
      <AppShell title={ru.leads.detailTitle}>
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>{ru.common.loading}</span>
        </div>
      </AppShell>
    )
  }

  if (!lead) {
    return (
      <AppShell title={ru.leads.detailTitle}>
        <p className="text-muted-foreground">Лид не найден</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/leads')}>
          {ru.common.back}
        </Button>
      </AppShell>
    )
  }

  const handleUpdateLead = async (leadId: string, data: Parameters<typeof updateLead>[1]) => {
    const updated = await updateLead(leadId, data)
    toast.success(ru.toast.leadUpdated)
    return updated
  }

  const handleUpdateFromForm = async (data: CreateLeadInput) => {
    if (!editingLeadId) return
    await updateLead(editingLeadId, data)
    toast.success(ru.toast.leadUpdated)
  }

  return (
    <>
      <AppShell
        title={lead.name}
        subtitle={ru.leads.detailTitle}
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/leads')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {ru.common.back}
          </Button>
        }
      >
        <div className="mx-auto max-w-3xl rounded-xl border bg-card p-6">
          <LeadDetailView
            lead={lead}
            onStatusChange={async (leadId, status) => {
              await updateStatus(leadId, status)
              toast.success(ru.toast.statusChanged)
            }}
            onEdit={(leadId) => openLeadForm(leadId)}
            onDelete={async (leadId) => {
              await deleteLead(leadId)
              toast.success(ru.toast.leadDeleted)
              navigate('/leads')
            }}
            onUpdateLead={handleUpdateLead}
            onAddComment={addComment}
            showFullPageLink={false}
          />
        </div>
      </AppShell>

      <LeadForm
        open={isLeadFormOpen}
        onOpenChange={(open) => !open && closeLeadForm()}
        lead={editingLeadId ? editingLead : null}
        onSubmit={handleUpdateFromForm}
        onCheckDuplicates={checkDuplicates}
      />
    </>
  )
}
