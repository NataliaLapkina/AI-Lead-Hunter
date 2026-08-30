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
import type { DashboardTranslate } from '@/features/dashboard/i18n/dashboardI18n'
import {
  getStatusBadgeVariant,
  type DashboardLead,
  type DashboardLeadStatus,
} from '@/features/dashboard/dashboardMvpMock'

interface LeadsTableProps {
  t: DashboardTranslate
  leads: DashboardLead[]
  onGenerateEmail: (lead: DashboardLead) => void
  onSaveLead: (leadId: string) => void
}

function statusLabel(t: DashboardTranslate, status: DashboardLeadStatus): string {
  return t(status)
}

export function LeadsTable({ t, leads, onGenerateEmail, onSaveLead }: LeadsTableProps) {
  return (
    <NlTable>
      <NlTableHead>
        <NlTableRow>
          <NlTableHeaderCell>{t('company')}</NlTableHeaderCell>
          <NlTableHeaderCell>{t('website')}</NlTableHeaderCell>
          <NlTableHeaderCell>{t('status')}</NlTableHeaderCell>
          <NlTableHeaderCell>{t('action')}</NlTableHeaderCell>
        </NlTableRow>
      </NlTableHead>
      <NlTableBody>
        {leads.map((lead) => (
          <NlTableRow key={lead.id}>
            <NlTableCell className="font-medium">{lead.company}</NlTableCell>
            <NlTableCell className="text-[#6b7280]">{lead.website}</NlTableCell>
            <NlTableCell>
              <NlBadge variant={getStatusBadgeVariant(lead.status)}>
                {statusLabel(t, lead.status)}
              </NlBadge>
            </NlTableCell>
            <NlTableCell>
              <div className="flex flex-wrap gap-2">
                <NlButton size="sm" onClick={() => onGenerateEmail(lead)}>
                  {t('generateEmail')}
                </NlButton>
                <NlButton
                  size="sm"
                  variant="outline"
                  onClick={() => onSaveLead(lead.id)}
                  disabled={lead.status !== 'new'}
                >
                  {t('save')}
                </NlButton>
              </div>
            </NlTableCell>
          </NlTableRow>
        ))}
      </NlTableBody>
    </NlTable>
  )
}
