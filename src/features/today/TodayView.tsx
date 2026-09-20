import { AppShell } from '@/components/layout/AppShell'
import { NeedsDecisionSection } from '@/features/today/NeedsDecisionSection'
import { ru } from '@/i18n/ru'

export function TodayView() {
  return (
    <AppShell title={ru.today.title}>
      <NeedsDecisionSection />
    </AppShell>
  )
}
