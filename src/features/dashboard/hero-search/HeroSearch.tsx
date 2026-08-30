import { NlButton, NlCard, NlCardBody, NlInput } from '@/components/nl'
import type { DashboardTranslate } from '@/features/dashboard/i18n/dashboardI18n'

interface HeroSearchProps {
  t: DashboardTranslate
  niche: string
  isSearching: boolean
  onNicheChange: (value: string) => void
  onFindLeads: () => void
}

export function HeroSearch({ t, niche, isSearching, onNicheChange, onFindLeads }: HeroSearchProps) {
  return (
    <NlCard className="mx-auto max-w-2xl">
      <NlCardBody>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <NlInput
              label={t('niche')}
              placeholder={t('enterNiche')}
              value={niche}
              onChange={(event) => onNicheChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onFindLeads()
              }}
            />
          </div>
          <NlButton
            type="button"
            size="lg"
            onClick={onFindLeads}
            disabled={isSearching || !niche.trim()}
          >
            {isSearching ? t('searching') : t('findLeads')}
          </NlButton>
        </div>
      </NlCardBody>
    </NlCard>
  )
}
