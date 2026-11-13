import { AppShell } from '@/components/layout/AppShell'
import { RecheckView } from '@/features/recheck/RecheckView'
import { ru } from '@/i18n/ru'

export function RecheckPage() {
  return (
    <AppShell title={ru.recheck.title}>
      <RecheckView />
    </AppShell>
  )
}
