import { AppShell } from '@/components/layout/AppShell'
import { NeedsDecisionSection } from '@/features/today/NeedsDecisionSection'
import { TodayTasksSection } from '@/features/today/TodayTasksSection'
import { ru } from '@/i18n/ru'

export function TodayView() {
  return (
    <AppShell title={ru.today.title}>
      <div className="space-y-8">
        <NeedsDecisionSection />
        <TodayTasksSection />
      </div>
    </AppShell>
  )
}
