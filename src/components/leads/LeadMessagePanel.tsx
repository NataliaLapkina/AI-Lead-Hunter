import { Link } from 'react-router-dom'
import type { Lead } from '@/domain/lead'
import { Button } from '@/components/ui/button'
import { ru } from '@/i18n/ru'
import { Copy, Loader2, Sparkles } from 'lucide-react'
import { LeadOutreachActions } from '@/components/leads/LeadOutreachActions'
import { LeadMessageVariants } from '@/components/leads/LeadMessageVariants'

interface LeadMessagePanelProps {
  lead: Lead
  message: string
  isGenerating: boolean
  restoringVariantId: string | null
  hasApiKey: boolean
  hasCurrentMessage: boolean
  onCopy: () => void
  onGenerate: () => void
  onRegenerate: () => void
  onRestore: (variantId: string) => void
}

export function LeadMessagePanel({
  lead,
  message,
  isGenerating,
  restoringVariantId,
  hasApiKey,
  hasCurrentMessage,
  onCopy,
  onGenerate,
  onRegenerate,
  onRestore,
}: LeadMessagePanelProps) {
  const canGenerate = hasApiKey && !isGenerating
  const canRegenerate = hasApiKey && hasCurrentMessage && !isGenerating

  return (
    <div id="lead-ai-message" className="space-y-4 scroll-mt-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{ru.leads.messageTabTitle}</p>
          <p className="text-xs text-muted-foreground">{ru.leads.messageTabHint}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onGenerate}
            disabled={!canGenerate}
            className="gap-2"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {ru.leads.generateAIMessage}
          </Button>
        </div>
      </div>

      {!hasApiKey && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
          {ru.leads.messageOpenAIRequiredHint}{' '}
          <Link to="/settings" className="font-medium underline underline-offset-2">
            {ru.nav.settings}
          </Link>
        </p>
      )}

      {hasApiKey && !hasCurrentMessage && (
        <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {ru.leads.messageRegenerateUnavailable}
        </p>
      )}

      {isGenerating && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {ru.leads.generatingAIMessage}
        </p>
      )}

      <div className="rounded-lg border bg-muted/30 p-3 text-sm leading-relaxed whitespace-pre-wrap">
        {message}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{ru.leads.sendVia}</p>
        <LeadOutreachActions lead={lead} message={message} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onCopy} className="gap-2">
          <Copy className="h-4 w-4" />
          {ru.leads.copyMessage}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onRegenerate}
          disabled={!canRegenerate}
          className="gap-2"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {ru.leads.regenerateAIMessage}
        </Button>
      </div>

      <LeadMessageVariants
        lead={lead}
        onRestore={onRestore}
        restoringId={restoringVariantId}
      />
    </div>
  )
}
