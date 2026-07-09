import { toast } from 'sonner'
import {
  NlBadge,
  NlButton,
  NlTable,
  NlTableBody,
  NlTableCell,
  NlTableHead,
  NlTableHeaderCell,
  NlTableRow,
} from '@/components/nl'
import {
  buildMockEmail,
  getStatusBadgeVariant,
  getStatusLabel,
  type DashboardKpiState,
  type DashboardLead,
} from '@/features/dashboard/dashboardMvpMock'

export interface EmailGeneratedPayload {
  lead: DashboardLead
  company: string
  draft: string
}

interface LeadsTableProps {
  leads: DashboardLead[]
  kpi: DashboardKpiState
  searchNiche: string
  onLeadsChange: (leads: DashboardLead[]) => void
  onKpiChange: (kpi: DashboardKpiState) => void
  onEmailGenerated: (payload: EmailGeneratedPayload) => void
}

export function LeadsTable({
  leads,
  kpi,
  searchNiche,
  onLeadsChange,
  onKpiChange,
  onEmailGenerated,
}: LeadsTableProps) {
  const handleSaveLead = (leadId: string) => {
    onLeadsChange(
      leads.map((lead) =>
        lead.id === leadId && lead.status === 'new' ? { ...lead, status: 'saved' } : lead,
      ),
    )
    onKpiChange({
      ...kpi,
      leadsUsed: Math.min(kpi.leadsLimit, kpi.leadsUsed + 1),
    })
    toast.success('Saved successfully')
  }

  const handleGenerateEmail = (lead: DashboardLead) => {
    if (kpi.aiEmailsUsed >= kpi.aiEmailsLimit) return

    const draft = buildMockEmail(searchNiche, lead.company)
    onLeadsChange(
      leads.map((item) => (item.id === lead.id ? { ...item, status: 'contacted' } : item)),
    )
    onKpiChange({
      ...kpi,
      aiEmailsUsed: Math.min(kpi.aiEmailsLimit, kpi.aiEmailsUsed + 1),
    })
    onEmailGenerated({ lead, company: lead.company, draft })
    toast.success('Email generated')
  }

  return (
    <NlTable>
      <NlTableHead>
        <NlTableRow>
          <NlTableHeaderCell>Company</NlTableHeaderCell>
          <NlTableHeaderCell>Website</NlTableHeaderCell>
          <NlTableHeaderCell>Status</NlTableHeaderCell>
          <NlTableHeaderCell>Action</NlTableHeaderCell>
        </NlTableRow>
      </NlTableHead>
      <NlTableBody>
        {leads.map((lead) => (
          <NlTableRow key={lead.id}>
            <NlTableCell className="font-medium">{lead.company}</NlTableCell>
            <NlTableCell className="text-[#6b7280]">{lead.website}</NlTableCell>
            <NlTableCell>
              <NlBadge variant={getStatusBadgeVariant(lead.status)}>
                {getStatusLabel(lead.status)}
              </NlBadge>
            </NlTableCell>
            <NlTableCell>
              <div className="flex flex-wrap gap-2">
                <NlButton size="sm" onClick={() => handleGenerateEmail(lead)}>
                  Generate Email
                </NlButton>
                <NlButton
                  size="sm"
                  variant="outline"
                  onClick={() => handleSaveLead(lead.id)}
                  disabled={lead.status !== 'new'}
                >
                  Save
                </NlButton>
              </div>
            </NlTableCell>
          </NlTableRow>
        ))}
      </NlTableBody>
    </NlTable>
  )
}
