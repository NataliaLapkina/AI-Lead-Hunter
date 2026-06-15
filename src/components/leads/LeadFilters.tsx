import type { LeadFilters, LeadSort, LeadSortField, LeadPotentialFilter } from '@/domain/lead'
import { LEAD_SOURCES, LEAD_STATUSES } from '@/lib/constants'
import { getSourceLabel, getStatusFilterLabel, getNicheLabel, getLeadPotentialShortLabel, ru } from '@/i18n/ru'
import { SearchInput } from '@/components/shared/SearchInput'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface LeadFiltersBarProps {
  filters: LeadFilters
  onFiltersChange: (filters: LeadFilters) => void
  sort: LeadSort
  onSortChange: (sort: LeadSort) => void
  niches: string[]
  tags: string[]
}

export function LeadFiltersBar({
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  niches,
  tags,
}: LeadFiltersBarProps) {
  return (
    <div className="space-y-4 rounded-xl border bg-card p-4">
      <SearchInput
        value={filters.search}
        onChange={(search) => onFiltersChange({ ...filters, search })}
        placeholder={ru.leads.searchPlaceholder}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            onFiltersChange({
              ...filters,
              attention: filters.attention === 'overdue' ? 'all' : 'overdue',
            })
          }
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            filters.attention === 'overdue'
              ? 'border-red-300 bg-red-50 text-red-700'
              : 'border-border text-muted-foreground hover:border-red-200 hover:text-red-700'
          }`}
        >
          {ru.leads.filterRequiresAttention}
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-2">
          <Label>{ru.leads.filterByStatus}</Label>
          <Select
            value={filters.status}
            onValueChange={(status) =>
              onFiltersChange({ ...filters, status: status as LeadFilters['status'] })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ru.common.all}</SelectItem>
              <SelectItem value="in_progress">{ru.dashboard.contacted}</SelectItem>
              <SelectItem value="client">{ru.dashboard.won}</SelectItem>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {getStatusFilterLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{ru.leads.filterByNiche}</Label>
          <Select
            value={filters.niche || 'all'}
            onValueChange={(niche) =>
              onFiltersChange({ ...filters, niche: niche === 'all' ? '' : niche })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ru.common.all}</SelectItem>
              {niches.map((n) => (
                <SelectItem key={n} value={n}>
                  {getNicheLabel(n)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{ru.leads.filterBySource}</Label>
          <Select
            value={filters.source}
            onValueChange={(source) =>
              onFiltersChange({ ...filters, source: source as LeadFilters['source'] })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ru.common.all}</SelectItem>
              {LEAD_SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {getSourceLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{ru.leads.filterByPotential}</Label>
          <Select
            value={filters.potential}
            onValueChange={(potential) =>
              onFiltersChange({
                ...filters,
                potential: potential as LeadPotentialFilter,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ru.common.all}</SelectItem>
              <SelectItem value="high">{getLeadPotentialShortLabel('high')}</SelectItem>
              <SelectItem value="medium">{getLeadPotentialShortLabel('medium')}</SelectItem>
              <SelectItem value="low">{getLeadPotentialShortLabel('low')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{ru.common.sort}</Label>
          <Select
            value={`${sort.field}-${sort.direction}`}
            onValueChange={(value) => {
              const [field, direction] = value.split('-') as [LeadSortField, 'asc' | 'desc']
              onSortChange({ field, direction })
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt-desc">{ru.sort.createdAt} ↓</SelectItem>
              <SelectItem value="createdAt-asc">{ru.sort.createdAt} ↑</SelectItem>
              <SelectItem value="updatedAt-desc">{ru.sort.updatedAt} ↓</SelectItem>
              <SelectItem value="name-asc">{ru.sort.name} ↑</SelectItem>
              <SelectItem value="name-desc">{ru.sort.name} ↓</SelectItem>
              <SelectItem value="status-asc">{ru.sort.status} ↑</SelectItem>
              <SelectItem value="niche-asc">{ru.sort.niche} ↑</SelectItem>
              <SelectItem value="potential-desc">{ru.sort.potential} ↓</SelectItem>
              <SelectItem value="potential-asc">{ru.sort.potential} ↑</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {tags.length > 0 && (
        <div className="space-y-2">
          <Label>{ru.leads.filterByTags}</Label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const active = filters.tags.includes(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    const newTags = active
                      ? filters.tags.filter((t) => t !== tag)
                      : [...filters.tags, tag]
                    onFiltersChange({ ...filters, tags: newTags })
                  }}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    active
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {tag}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
