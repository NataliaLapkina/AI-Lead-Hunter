import { Pencil, Trash2, ExternalLink } from 'lucide-react'
import type { AutoSearchDraftLead } from '@/domain/lead'
import { getSourceLabel, getNicheLabel, ru } from '@/i18n/ru'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getOpportunityLabel } from '@/features/leads/improvements'

interface AutoSearchPreviewTableProps {
  drafts: AutoSearchDraftLead[]
  onToggleSelect: (id: string) => void
  onToggleSelectAll: (selected: boolean) => void
  onEdit: (draft: AutoSearchDraftLead) => void
  onDelete: (id: string) => void
}

function formatContacts(draft: AutoSearchDraftLead): string {
  const parts: string[] = []
  if (draft.contacts.phones[0]) parts.push(draft.contacts.phones[0])
  if (draft.contacts.emails[0]) parts.push(draft.contacts.emails[0])
  if (draft.contacts.telegram) parts.push(draft.contacts.telegram)
  return parts.join(' · ') || '—'
}

export function AutoSearchPreviewTable({
  drafts,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onDelete,
}: AutoSearchPreviewTableProps) {
  const allSelected = drafts.length > 0 && drafts.every((d) => d.selected)
  const selectedCount = drafts.filter((d) => d.selected).length

  if (drafts.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        {ru.autoSearch.previewEmpty}
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {ru.autoSearch.previewTitle.replace('{count}', String(drafts.length))}
          {selectedCount > 0 && (
            <span className="ml-2 text-muted-foreground">({selectedCount} выбрано)</span>
          )}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onToggleSelectAll(!allSelected)}
          >
            {allSelected ? ru.autoSearch.deselectAll : ru.autoSearch.selectAll}
          </Button>
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-xl border md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-10 px-3 py-3" />
              <th className="px-4 py-3 text-left font-medium">{ru.autoSearch.columnName}</th>
              <th className="px-4 py-3 text-left font-medium">{ru.autoSearch.columnNiche}</th>
              <th className="px-4 py-3 text-left font-medium">{ru.autoSearch.columnSource}</th>
              <th className="px-4 py-3 text-left font-medium">{ru.autoSearch.columnContacts}</th>
              <th className="px-4 py-3 text-left font-medium">{ru.autoSearch.opportunitiesLabel}</th>
              <th className="px-4 py-3 text-right font-medium">{ru.common.actions}</th>
            </tr>
          </thead>
          <tbody>
            {drafts.map((draft) => (
              <tr key={draft.id} className="border-b last:border-0">
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={draft.selected}
                    onChange={() => onToggleSelect(draft.id)}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{draft.name}</div>
                  {draft.website && (
                    <a
                      href={draft.website.startsWith('http') ? draft.website : `https://${draft.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Ссылка
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {getNicheLabel(draft.niche)}
                  {draft.city && ` · ${draft.city}`}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {getSourceLabel(draft.source)}
                </td>
                <td className="max-w-[160px] truncate px-4 py-3 text-muted-foreground">
                  {formatContacts(draft)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex max-w-[180px] flex-wrap gap-1">
                    {draft.opportunities.slice(0, 2).map((o) => (
                      <Badge key={o} variant="outline" className="text-xs">
                        {getOpportunityLabel(o)}
                      </Badge>
                    ))}
                    {draft.opportunities.length > 2 && (
                      <Badge variant="muted" className="text-xs">
                        +{draft.opportunities.length - 2}
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={ru.autoSearch.editDraft}
                      onClick={() => onEdit(draft)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={ru.autoSearch.deleteDraft}
                      onClick={() => onDelete(draft.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {drafts.map((draft) => (
          <div key={draft.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-input"
                checked={draft.selected}
                onChange={() => onToggleSelect(draft.id)}
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{draft.name}</p>
                <p className="text-sm text-muted-foreground">
                  {getNicheLabel(draft.niche)}
                  {draft.city && ` · ${draft.city}`} · {getSourceLabel(draft.source)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{formatContacts(draft)}</p>
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                  {draft.generatedMessage.split('\n')[0]}
                </p>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onEdit(draft)}>
                {ru.autoSearch.editDraft}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onDelete(draft.id)}
              >
                {ru.autoSearch.deleteDraft}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
