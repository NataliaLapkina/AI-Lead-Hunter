import { useMemo, useState } from 'react'
import { NlAvatar, NlButton, NlNavbar } from '@/components/nl'
import { AiEmailPanel } from '@/features/dashboard/ai-email/AiEmailPanel'
import { readFirstVisit, resolveActivationPhase } from '@/features/dashboard/activationStorage'
import { DEFAULT_KPI, type DashboardKpiState, type DashboardLead } from '@/features/dashboard/dashboardMvpMock'
import { HeroSearch } from '@/features/dashboard/hero-search/HeroSearch'
import { KpiCards } from '@/features/dashboard/kpi/KpiCards'
import { LeadsTable } from '@/features/dashboard/leads/LeadsTable'
import { OnboardingCard } from '@/features/dashboard/onboarding/OnboardingCard'

interface AiEmailState {
  company: string
  draft: string
  visible: boolean
}

const EMPTY_AI_EMAIL: AiEmailState = {
  company: '',
  draft: '',
  visible: false,
}

export function DashboardMvpView() {
  const [firstVisit, setFirstVisit] = useState(readFirstVisit)
  const [leads, setLeads] = useState<DashboardLead[]>([])
  const [selectedLead, setSelectedLead] = useState<DashboardLead | null>(null)
  const [aiEmail, setAiEmail] = useState<AiEmailState>(EMPTY_AI_EMAIL)
  const [kpi, setKpi] = useState<DashboardKpiState>(DEFAULT_KPI)
  const [searchNiche, setSearchNiche] = useState('')

  const phase = useMemo(
    () => resolveActivationPhase(firstVisit, leads.length),
    [firstVisit, leads.length],
  )

  const handleLeadsFound = (results: DashboardLead[], niche: string) => {
    setLeads(results)
    setSearchNiche(niche)
    setSelectedLead(null)
    setAiEmail(EMPTY_AI_EMAIL)
  }

  const handleEmailGenerated = (payload: {
    lead: DashboardLead
    company: string
    draft: string
  }) => {
    setSelectedLead(payload.lead)
    setAiEmail({
      company: payload.company,
      draft: payload.draft,
      visible: true,
    })
  }

  return (
    <div className="min-h-full bg-[#f8fafc]">
      <NlNavbar
        brand="AI Lead Hunter"
        right={
          <>
            <NlButton variant="outline" size="sm">
              Upgrade
            </NlButton>
            <NlAvatar initials="AL" />
          </>
        }
      />

      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <KpiCards kpi={kpi} />

        {phase === 'onboarding' && <OnboardingCard onComplete={() => setFirstVisit(false)} />}

        {phase === 'empty' && <HeroSearch onLeadsFound={handleLeadsFound} />}

        {phase === 'active' && (
          <>
            <LeadsTable
              leads={leads}
              kpi={kpi}
              searchNiche={searchNiche}
              onLeadsChange={setLeads}
              onKpiChange={setKpi}
              onEmailGenerated={handleEmailGenerated}
            />

            {aiEmail.visible && selectedLead && (
              <AiEmailPanel
                key={selectedLead.id}
                company={aiEmail.company}
                draft={aiEmail.draft}
                onDraftChange={(draft) => setAiEmail((current) => ({ ...current, draft }))}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}
