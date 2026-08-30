import { NlBadge, NlButton, NlCard, NlCardBody } from '@/components/nl'
import type { DashboardTranslate } from '@/features/dashboard/i18n/dashboardI18n'

interface OnboardingCardProps {
  t: DashboardTranslate
  onStartDemo: () => void
}

export function OnboardingCard({ t, onStartDemo }: OnboardingCardProps) {
  return (
    <NlCard className="mx-auto max-w-xl text-center">
      <NlCardBody className="space-y-5">
        <div className="flex justify-center">
          <NlBadge variant="new">{t('freeDemo')}</NlBadge>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-[#111827]">
            {t('onboardingTitle')}
          </h1>
          <p className="text-sm text-[#6b7280]">{t('onboardingSubtitle')}</p>
        </div>
        <NlButton size="lg" onClick={onStartDemo}>
          {t('startFreeDemo')}
        </NlButton>
      </NlCardBody>
    </NlCard>
  )
}
