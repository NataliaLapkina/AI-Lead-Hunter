import type { SearchQuery } from '@/domain/lead'
import { getPlatformLabel, ru } from '@/i18n/ru'
import { copyToClipboard } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Copy, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

interface QueryCardProps {
  query: SearchQuery
  onAddLead?: (query: SearchQuery) => void
}

export function QueryCard({ query, onAddLead }: QueryCardProps) {
  const handleCopy = async () => {
    await copyToClipboard(query.query)
    toast.success(ru.toast.copySuccess)
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/30">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {getPlatformLabel(query.platform)}
          </Badge>
        </div>
        <p className="text-sm font-medium leading-relaxed">{query.query}</p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button variant="ghost" size="icon" onClick={handleCopy} title={ru.search.copyQuery}>
          <Copy className="h-4 w-4" />
        </Button>
        {onAddLead && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onAddLead(query)}
            title={ru.search.addLeadFromSearch}
          >
            <UserPlus className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

interface QueryGeneratorProps {
  queries: SearchQuery[]
  onAddLead?: (query: SearchQuery) => void
}

export function QueryGenerator({ queries, onAddLead }: QueryGeneratorProps) {
  if (queries.length === 0) return null

  const grouped = queries.reduce(
    (acc, q) => {
      if (!acc[q.platform]) acc[q.platform] = []
      acc[q.platform].push(q)
      return acc
    },
    {} as Record<string, SearchQuery[]>,
  )

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {ru.search.resultsCount.replace('{count}', String(queries.length))}
      </p>
      {Object.entries(grouped).map(([platform, items]) => (
        <div key={platform} className="space-y-3">
          <h3 className="text-sm font-semibold">{getPlatformLabel(platform as SearchQuery['platform'])}</h3>
          <div className="space-y-2">
            {items.map((q) => (
              <QueryCard key={q.id} query={q} onAddLead={onAddLead} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
