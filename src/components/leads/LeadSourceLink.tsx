import type { Lead } from '@/domain/lead'
import { getLeadLinkDisplay, getLeadLinkUrl } from '@/lib/leadLinks'
import { ru } from '@/i18n/ru'
import { ExternalLink } from 'lucide-react'

interface LeadSourceLinkProps {
  lead: Pick<Lead, 'sourceUrl' | 'website'>
  className?: string
}

export function LeadSourceLink({ lead, className }: LeadSourceLinkProps) {
  const href = getLeadLinkUrl(lead)
  if (!href) return null

  const display = getLeadLinkDisplay(lead)

  return (
    <div
      className={`mt-0.5 flex items-center gap-2 ${className ?? ''}`}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="flex min-w-0 items-center gap-1 text-xs text-primary hover:underline"
        title={href}
      >
        <span className="truncate">{display}</span>
        <ExternalLink className="h-3 w-3 shrink-0" />
      </a>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="shrink-0 text-xs text-muted-foreground hover:text-primary"
        title={ru.leads.openSource}
        aria-label={ru.leads.openSource}
      >
        {ru.leads.openSource}
      </a>
    </div>
  )
}
