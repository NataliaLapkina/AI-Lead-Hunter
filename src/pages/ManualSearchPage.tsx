import { useEffect, useState, useRef } from 'react'
import { Search } from 'lucide-react'
import { NicheSearchForm } from '@/components/search/NicheSearchForm'
import { QueryGenerator } from '@/components/search/QueryGenerator'
import { EmptyState } from '@/components/shared/EmptyState'
import { LeadForm } from '@/components/leads/LeadForm'
import { useQueryGenerator } from '@/features/search/hooks/useQueryGenerator'
import { useLeads } from '@/features/leads/hooks/useLeads'
import { ru } from '@/i18n/ru'
import { toast } from 'sonner'
import type { CreateLeadInput, SearchQuery, LeadSource } from '@/domain/lead'

export function ManualSearchPage() {
  const { queries, isGenerating, generate, loadHistory } = useQueryGenerator()
  const { createLead, checkDuplicates } = useLeads()
  const [formOpen, setFormOpen] = useState(false)
  const [formInitial, setFormInitial] = useState<Partial<CreateLeadInput>>()
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const handleGenerate = async (data: { niche: string; city: string; source?: string }) => {
    await generate({
      niche: data.niche,
      city: data.city,
      source: data.source as LeadSource | undefined,
    })
    formRef.current?.scrollIntoView({ behavior: 'smooth' })
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
      <div className="mx-auto max-w-3xl space-y-8">
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
