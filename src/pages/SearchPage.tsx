import { useEffect, useState, useRef } from 'react'
import { Search } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { NicheSearchForm } from '@/components/search/NicheSearchForm'
import { NicheSuggestions } from '@/components/search/NicheSuggestions'
import { QueryGenerator } from '@/components/search/QueryGenerator'
import { EmptyState } from '@/components/shared/EmptyState'
import { LeadForm } from '@/components/leads/LeadForm'
import { useQueryGenerator } from '@/features/search/hooks/useQueryGenerator'
import { useLeads } from '@/features/leads/hooks/useLeads'
import { useSettingsStore } from '@/stores'
import { getSearchNichePresets } from '@/lib/nichePresets'
import { ru } from '@/i18n/ru'
import { toast } from 'sonner'
import type { CreateLeadInput, SearchQuery, LeadSource } from '@/domain/lead'

export function SearchPage() {
  const { settings, fetchSettings } = useSettingsStore()
  const { queries, isGenerating, generate, loadHistory } = useQueryGenerator()
  const { createLead, checkDuplicates } = useLeads()
  const [formOpen, setFormOpen] = useState(false)
  const [formInitial, setFormInitial] = useState<Partial<CreateLeadInput>>()
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchSettings()
    loadHistory()
  }, [fetchSettings, loadHistory])

  const handleGenerate = async (data: { niche: string; city: string; source?: string }) => {
    await generate({
      niche: data.niche,
      city: data.city,
      source: data.source as LeadSource | undefined,
    })
    formRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handlePresetSelect = (name: string) => {
    handleGenerate({ niche: name, city: '' })
  }

  const handleAddLeadFromQuery = (query: SearchQuery) => {
    setFormInitial({
      niche: query.niche,
      city: query.city ?? '',
      source: query.source ?? 'other',
    })
    setFormOpen(true)
  }

  const handleCreateLead = async (data: CreateLeadInput) => {
    await createLead(data)
    toast.success(ru.toast.leadCreated)
  }

  return (
    <>
      <AppShell title={ru.search.title} subtitle={ru.search.subtitle}>
        <div className="mx-auto max-w-3xl space-y-8">
          <NicheSuggestions
            presets={getSearchNichePresets(settings?.nichePresets ?? [])}
            onSelect={handlePresetSelect}
          />

          <NicheSearchForm onGenerate={handleGenerate} isGenerating={isGenerating} />

          <div ref={formRef}>
            {queries.length > 0 ? (
              <QueryGenerator queries={queries} onAddLead={handleAddLeadFromQuery} />
            ) : (
              <EmptyState
                icon={<Search className="h-10 w-10" />}
                title={ru.search.emptyTitle}
                description={ru.search.emptyDescription}
              />
            )}
          </div>
        </div>
      </AppShell>

      <LeadForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initialValues={formInitial}
        onSubmit={handleCreateLead}
        onCheckDuplicates={checkDuplicates}
      />
    </>
  )
}
