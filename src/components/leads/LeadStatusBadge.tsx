import type { LeadStatus } from '@/domain/lead'
import { getStatusLabel } from '@/i18n/ru'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const statusVariants: Record<LeadStatus, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'muted' | 'outline'> = {
  draft: 'muted',
  ready_to_send: 'outline',
  new: 'secondary',
  contacted: 'default',
  replied: 'warning',
  meeting: 'default',
  won: 'success',
  lost: 'destructive',
  archived: 'muted',
}

interface LeadStatusBadgeProps {
  status: LeadStatus
  className?: string
}

export function LeadStatusBadge({ status, className }: LeadStatusBadgeProps) {
  return (
    <Badge variant={statusVariants[status]} className={cn('font-medium', className)}>
      {getStatusLabel(status)}
    </Badge>
  )
}
