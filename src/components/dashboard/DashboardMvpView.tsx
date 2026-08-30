import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { NlAvatar, NlButton, NlNavbar } from '@/components/nl'
import { AiEmailPanel, type AiEmailState } from '@/features/dashboard/ai-email/AiEmailPanel'
import {
  completeOnboarding,
  readFirstVisit,
  resolveActivationPhase,
} from '@/features/dashboard/activationStorage'
import {
  DEFAULT_KPI,
  MOCK_USER_PROFILE,
  buildMockEmail,
  buildMockLeads,
  type DashboardKpiState,
  type DashboardLead,
} from '@/features/dashboard/dashboardMvpMock'
import {
  createDashboardTranslate,
  type Language,
} from '@/features/dashboard/i18n/dashboardI18n'
import { HeroSearch } from '@/features/dashboard/hero-search/HeroSearch'
import { KpiCards } from '@/features/dashboard/kpi/KpiCards'
import { LeadsTable } from '@/features/dashboard/leads/LeadsTable'
import { OnboardingCard } from '@/features/dashboard/onboarding/OnboardingCard'

const EMPTY_AI_EMAIL: AiEmailState = {
  company: '',
  draft: '',
  subject: '',
  visible: false,
}

export function DashboardMvpView() {
  const [language, setLanguage] = useState<Language>('ru')
  const [firstVisit, setFirstVisit] = useState(() => readFirstVisit())
  const [niche, setNiche] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [leads, setLeads] = useState<DashboardLead[]>([])
  const [aiEmail, setAiEmail] = useState<AiEmailState>(EMPTY_AI_EMAIL)
  const [kpi, setKpi] = useState<DashboardKpiState>(DEFAULT_KPI)
  const [searchNiche, setSearchNiche] = useState('')

  const translate = useMemo(() => createDashboardTranslate(language), [language])

  const phase = useMemo(
    () => resolveActivationPhase(firstVisit, leads.length),
    [firstVisit, leads.length],
  )

  const handleStartDemo = () => {
    completeOnboarding()
    setFirstVisit(false)
  }

  const handleFindLeads = async () => {
    const trimmed = niche.trim()
    if (!trimmed || isSearching) return

    setIsSearching(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 700))

      const results = buildMockLeads(trimmed)
      setLeads(results)
      setSearchNiche(trimmed)
      setAiEmail(EMPTY_AI_EMAIL)
      completeOnboarding()
      setFirstVisit(false)
      toast.success(translate('leadAdded'))
    } finally {
      setIsSearching(false)
    }
  }

  const handleSaveLead = (leadId: string) => {
    setLeads((current) =>
      current.map((lead) =>
        lead.id === leadId && lead.status === 'new' ? { ...lead, status: 'saved' } : lead,
      ),
    )
    setKpi((current) => ({
      ...current,
      leadsUsed: Math.min(current.leadsLimit, current.leadsUsed + 1),
    }))
    toast.success(translate('savedSuccessfully'))
  }

  const handleGenerateEmail = (lead: DashboardLead) => {
    if (kpi.aiEmailsUsed >= kpi.aiEmailsLimit) return

    const { draft, subject } = buildMockEmail({
      language,
      niche: searchNiche || niche,
      company: lead.company,
      userProfile: MOCK_USER_PROFILE,
    })
    setAiEmail({
      company: lead.company,
      draft,
      subject,
      visible: true,
    })
    setLeads((current) =>
      current.map((item) => (item.id === lead.id ? { ...item, status: 'contacted' } : item)),
    )
    setKpi((current) => ({
      ...current,
      aiEmailsUsed: Math.min(current.aiEmailsLimit, current.aiEmailsUsed + 1),
    }))
    toast.success(translate('emailGenerated'))
  }

  const handleCopyEmail = async () => {
    if (!aiEmail.draft.trim()) return
    await navigator.clipboard.writeText(aiEmail.draft)
  }

  const handleSaveEmail = () => {
    if (!aiEmail.draft.trim()) return
    toast.success(translate('savedSuccessfully'))
  }

  return (
    <div className="min-h-full bg-[#f8fafc]">
      <NlNavbar
        brand={translate('appName')}
        right={
          <>
            <div className="flex items-center gap-1">
              <NlButton
                variant={language === 'ru' ? 'primary' : 'outline'}
                size="sm"
                type="button"
                onClick={() => setLanguage('ru')}
              >
                {translate('languageRu')}
              </NlButton>
              <NlButton
                variant={language === 'en' ? 'primary' : 'outline'}
                size="sm"
                type="button"
                onClick={() => setLanguage('en')}
              >
                {translate('languageEn')}
              </NlButton>
            </div>
            <NlButton variant="outline" size="sm" type="button">
              {translate('upgrade')}
            </NlButton>
            <NlAvatar initials="AL" />
          </>
        }
      />

      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <KpiCards t={translate} kpi={kpi} />

        {phase === 'onboarding' && (
          <OnboardingCard t={translate} onStartDemo={handleStartDemo} />
        )}

        {phase === 'empty' && (
          <HeroSearch
            t={translate}
            niche={niche}
            isSearching={isSearching}
            onNicheChange={setNiche}
            onFindLeads={() => void handleFindLeads()}
          />
        )}

        {leads.length > 0 && (
          <>
            <LeadsTable
              t={translate}
              leads={leads}
              onGenerateEmail={handleGenerateEmail}
              onSaveLead={handleSaveLead}
            />

            <AiEmailPanel
              t={translate}
              aiEmail={aiEmail}
              onDraftChange={(draft) => setAiEmail((current) => ({ ...current, draft }))}
              onCopy={() => void handleCopyEmail()}
              onSave={handleSaveEmail}
            />
          </>
        )}
      </main>
    </div>
  )
}
