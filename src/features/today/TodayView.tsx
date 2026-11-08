import { useCallback, useRef } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { NeedsDecisionSection } from '@/features/today/NeedsDecisionSection'
import { TodayAttentionSection } from '@/features/today/TodayAttentionSection'
import { TodayDeferredSection } from '@/features/today/TodayDeferredSection'
import { TodayTasksSection } from '@/features/today/TodayTasksSection'
import { ru } from '@/i18n/ru'

export function TodayView() {
  const refetchTasksRef = useRef<(() => void) | null>(null)
  const registerTasksRefetch = useCallback((refetch: () => void) => {
    refetchTasksRef.current = refetch
  }, [])

  return (
    <AppShell title={ru.today.title}>
      <div className="space-y-8">
        <NeedsDecisionSection />
        <TodayTasksSection onRefetchReady={registerTasksRefetch} />
        <TodayAttentionSection
          onTasksRefetch={() => {
            refetchTasksRef.current?.()
          }}
        />
        <TodayDeferredSection />
      </div>
    </AppShell>
  )
}
