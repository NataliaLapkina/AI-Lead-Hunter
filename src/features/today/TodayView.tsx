import { useCallback, useRef } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { NeedsDecisionSection } from '@/features/today/NeedsDecisionSection'
import { TodayAttentionSection } from '@/features/today/TodayAttentionSection'
import { TodayDeferredSection } from '@/features/today/TodayDeferredSection'
import { TodayTasksSection } from '@/features/today/TodayTasksSection'
import { ru } from '@/i18n/ru'

export function TodayView() {
  const refetchTasksRef = useRef<(() => void) | null>(null)
  const refetchAttentionRef = useRef<(() => void) | null>(null)
  const refetchDeferredRef = useRef<(() => void) | null>(null)
  const registerTasksRefetch = useCallback((refetch: () => void) => {
    refetchTasksRef.current = refetch
  }, [])
  const registerAttentionRefetch = useCallback((refetch: () => void) => {
    refetchAttentionRef.current = refetch
  }, [])
  const registerDeferredRefetch = useCallback((refetch: () => void) => {
    refetchDeferredRef.current = refetch
  }, [])

  return (
    <AppShell title={ru.today.title}>
      <div className="space-y-8">
        <NeedsDecisionSection
          onSnoozed={() => {
            refetchDeferredRef.current?.()
          }}
          onTasksRefetch={() => {
            refetchTasksRef.current?.()
          }}
        />
        <TodayTasksSection
          onRefetchReady={registerTasksRefetch}
          onCompleted={() => {
            refetchAttentionRef.current?.()
          }}
        />
        <TodayAttentionSection
          onRefetchReady={registerAttentionRefetch}
          onTasksRefetch={() => {
            refetchTasksRef.current?.()
          }}
        />
        <TodayDeferredSection onRefetchReady={registerDeferredRefetch} />
      </div>
    </AppShell>
  )
}
