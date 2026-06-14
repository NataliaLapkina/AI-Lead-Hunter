import type { Lead, LeadStatus } from '@/domain/lead'
import { LEAD_STATUSES } from '@/lib/constants'
import { getSourceLabel } from '@/i18n/ru'
import { formatDate } from '@/lib/utils'
import { LeadStatusBadge } from '@/components/leads/LeadStatusBadge'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getStatusLabel } from '@/i18n/ru'
import { ExternalLink } from 'lucide-react'

interface LeadTableProps {
  leads: Lead[]
  onRowClick: (id: string) => void
  onStatusChange: (id: string, status: LeadStatus) => void
}

export function LeadTable({ leads, onRowClick, onStatusChange }: LeadTableProps) {
  if (leads.length === 0) return null

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">{/* name */}Название</th>
              <th className="px-4 py-3 text-left font-medium">Ниша</th>
              <th className="px-4 py-3 text-left font-medium">Город</th>
              <th className="px-4 py-3 text-left font-medium">Источник</th>
              <th className="px-4 py-3 text-left font-medium">Статус</th>
              <th className="px-4 py-3 text-left font-medium">Теги</th>
              <th className="px-4 py-3 text-left font-medium">Создан</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => onRowClick(lead.id)}
                className="cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/30"
              >
                <td className="px-4 py-3">
                  <div className="font-medium">{lead.name}</div>
                  {lead.website && (
                    <a
                      href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5 flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      {lead.website.replace(/^https?:\/\//, '')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{lead.niche}</td>
                <td className="px-4 py-3 text-muted-foreground">{lead.city || '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {getSourceLabel(lead.source)}
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={lead.status}
                    onValueChange={(status) =>
                      onStatusChange(lead.id, status as LeadStatus)
                    }
                  >
                    <SelectTrigger className="h-8 w-[130px] border-0 bg-transparent shadow-none">
                      <SelectValue>
                        <LeadStatusBadge status={lead.status} />
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {getStatusLabel(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1">
                    {lead.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {(lead.opportunities?.length ?? 0) > 0 && (
                      <Badge variant="warning" className="text-xs">
                        {lead.opportunities!.length} улуч.
                      </Badge>
                    )}
                    {lead.tags.length > 2 && (
                      <Badge variant="muted" className="text-xs">
                        +{lead.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(lead.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {leads.map((lead) => (
          <button
            key={lead.id}
            type="button"
            onClick={() => onRowClick(lead.id)}
            className="w-full rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/30"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{lead.name}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {lead.niche}
                  {lead.city && ` · ${lead.city}`}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <LeadStatusBadge status={lead.status} />
                {(lead.opportunities?.length ?? 0) > 0 && (
                  <Badge variant="warning" className="text-xs">
                    {lead.opportunities!.length} улуч.
                  </Badge>
                )}
              </div>
            </div>
            {lead.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {lead.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              {formatDate(lead.createdAt)}
            </p>
          </button>
        ))}
      </div>
    </>
  )
}
