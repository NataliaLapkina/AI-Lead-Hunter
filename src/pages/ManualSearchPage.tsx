import { useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import { NicheSearchForm } from '@/components/search/NicheSearchForm'
import { QueryGenerator } from '@/components/search/QueryGenerator'
import { EmptyState } from '@/components/shared/EmptyState'
import { useQueryGenerator } from '@/features/search/hooks/useQueryGenerator'
import { useLeads } from '@/features/leads/hooks/useLeads'
import { buildCreateLeadInputFromManualSearch } from '@/features/search/buildLeadFromManualSearch'
import { ru } from '@/i18n/ru'
import { toast } from 'sonner'
import type { SearchQuery, LeadSource } from '@/domain/lead'

export function ManualSearchPage() {
  const navigate = useNavigate()
  const { queries, isGenerating, generate, loadHistory } = useQueryGenerator()
  const { createLead, checkDuplicates } = useLeads()
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

  const handleCreateLeadFromQuery = async (query: SearchQuery, foundText?: string) => {
    const built = buildCreateLeadInputFromManualSearch(query, foundText)
    if (!built) {
      toast.error(ru.search.insufficientLeadData)
      return
    }

    const duplicates = await checkDuplicates({
      website: built.input.website,
      sourceUrl: built.input.sourceUrl,
      email: built.input.contacts.email,
      phone: built.input.contacts.phone,
    })

    if (duplicates.length > 0) {
      toast.info(ru.search.leadAlreadyExists)
      navigate(`/leads/${duplicates[0].id}`)
      return
    }

    const lead = await createLead({
      ...built.input,
      siteAudit: built.siteAudit,
    })
    toast.success(ru.toast.leadCreated)
    navigate(`/leads/${lead.id}`)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <NicheSearchForm onGenerate={handleGenerate} isGenerating={isGenerating} />

      <div ref={formRef}>
        {queries.length > 0 ? (
          <QueryGenerator queries={queries} onCreateLead={handleCreateLeadFromQuery} />
        ) : (
          <EmptyState
            icon={<Search className="h-10 w-10" />}
            title={ru.search.emptyTitle}
            description={ru.search.emptyDescription}
          />
        )}
      </div>
    </div>
  )
}
