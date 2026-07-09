import { NlBadge, NlButton, NlCard, NlCardBody } from '@/components/nl'
import { completeOnboarding } from '@/features/dashboard/activationStorage'

interface OnboardingCardProps {
  onComplete: () => void
}

export function OnboardingCard({ onComplete }: OnboardingCardProps) {
  const handleStartDemo = () => {
    completeOnboarding()
    onComplete()
  }

  return (
    <NlCard className="mx-auto max-w-xl text-center">
      <NlCardBody className="space-y-5">
        <div className="flex justify-center">
          <NlBadge variant="new">Free demo</NlBadge>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-[#111827]">
            Find your first clients in 60 seconds
          </h1>
          <p className="text-sm text-[#6b7280]">
            AI will find leads and generate outreach emails automatically
          </p>
        </div>
        <NlButton size="lg" onClick={handleStartDemo}>
          Start free demo
        </NlButton>
      </NlCardBody>
    </NlCard>
  )
}
