import type { LeadActivity } from '@/domain/lead'
import { ru } from '@/i18n/ru'
import { formatDateTime } from '@/lib/utils'

interface LeadActivityFeedProps {
  activities: LeadActivity[]
}

export function LeadActivityFeed({ activities }: LeadActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">История изменений пуста</p>
    )
  }

  const sorted = [...activities].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )

  return (
    <div className="space-y-3">
      {sorted.map((activity) => (
        <div
          key={activity.id}
          className="rounded-lg border bg-card p-3 text-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">
              {ru.activity[activity.type as keyof typeof ru.activity] ?? activity.type}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(activity.timestamp)}
            </span>
          </div>
          {activity.type === 'status_change' && (
            <p className="mt-1 text-muted-foreground">
              {String(activity.payload.from ?? '')} → {String(activity.payload.to ?? '')}
            </p>
          )}
          {activity.type === 'comment_added' && (
            <p className="mt-1 text-muted-foreground">{String(activity.payload.text ?? '')}</p>
          )}
          {activity.type === 'site_audited' && (
            <p className="mt-1 text-muted-foreground">{String(activity.payload.summary ?? '')}</p>
          )}
          {activity.type === 'synced' && (
            <p className="mt-1 text-muted-foreground">
              Синхронизировано: {String(activity.payload.mergedCount ?? '')} лидов
            </p>
          )}
          {activity.type === 'message_generated' && (
            <p className="mt-1 line-clamp-2 text-muted-foreground">
              {String(activity.payload.preview ?? 'Сообщение сгенерировано')}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
