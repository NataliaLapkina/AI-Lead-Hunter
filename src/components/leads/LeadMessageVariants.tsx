import type { Lead } from '@/domain/lead'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/utils'
import { normalizeMessageHistory } from '@/lib/leadMessageHistory'
import { ru } from '@/i18n/ru'

interface LeadMessageVariantsProps {
  lead: Lead
  onRestore: (variantId: string) => void
  restoringId?: string | null
}

export function LeadMessageVariants({
  lead,
  onRestore,
  restoringId = null,
}: LeadMessageVariantsProps) {
  const history = normalizeMessageHistory(lead.messageHistory)
  if (history.length === 0) return null

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <p className="text-sm font-medium">{ru.leads.messageHistoryTitle}</p>
      <div className="space-y-3">
        {history.map((variant, index) => (
          <div key={variant.id} className="space-y-2 rounded-lg border bg-background p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">
                {ru.leads.messageVariantLabel.replace('{n}', String(index + 1))}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(variant.createdAt)}
              </p>
            </div>
            <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap text-sm font-sans text-muted-foreground">
              {variant.content}
            </pre>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={restoringId === variant.id}
              onClick={() => onRestore(variant.id)}
            >
              {ru.leads.restoreMessageVariant}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
