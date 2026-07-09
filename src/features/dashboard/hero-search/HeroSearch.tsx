import { useState } from 'react'
import { toast } from 'sonner'
import { NlButton, NlCard, NlCardBody, NlInput } from '@/components/nl'
import { buildMockLeads, type DashboardLead } from '@/features/dashboard/dashboardMvpMock'

interface HeroSearchProps {
  onLeadsFound: (leads: DashboardLead[], niche: string) => void
}

export function HeroSearch({ onLeadsFound }: HeroSearchProps) {
  const [niche, setNiche] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const handleSearch = async () => {
    const trimmed = niche.trim()
    if (!trimmed) return

    setIsSearching(true)
    await new Promise((resolve) => setTimeout(resolve, 700))

    const results = buildMockLeads(trimmed)
    onLeadsFound(results, trimmed)
    setIsSearching(false)
    toast.success('Lead added')
  }

  return (
    <NlCard className="mx-auto max-w-2xl">
      <NlCardBody>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <NlInput
              label="Niche"
              placeholder="Enter niche or keyword (e.g. design agency)"
              value={niche}
              onChange={(event) => setNiche(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void handleSearch()
              }}
            />
          </div>
          <NlButton size="lg" onClick={() => void handleSearch()} disabled={isSearching || !niche.trim()}>
            {isSearching ? 'Searching...' : 'Find leads'}
          </NlButton>
        </div>
      </NlCardBody>
    </NlCard>
  )
}
