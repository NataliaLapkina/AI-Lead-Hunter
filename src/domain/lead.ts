export type LeadStatus =
  | 'draft'
  | 'ready_to_send'
  | 'new'
  | 'contacted'
  | 'replied'
  | 'meeting'
  | 'won'
  | 'lost'
  | 'archived'

export type AutoSearchSource = 'avito' | 'yandex_maps' | '2gis' | 'vk'

export type LeadSource =
  | AutoSearchSource
  | 'telegram'
  | 'company_site'
  | 'other'

export type SearchPlatform = 'google' | 'whatsapp' | 'vk' | 'telegram' | 'other'

export type ImprovementOpportunity =
  | 'no_website'
  | 'no_booking_form'
  | 'no_whatsapp'
  | 'outdated_design'
  | 'no_online_booking'

export type PlanType = 'free' | 'pro' | 'agency'

export type ActivityType =
  | 'status_change'
  | 'note_added'
  | 'message_generated'
  | 'created'
  | 'updated'
  | 'imported'
  | 'comment_added'
  | 'site_audited'
  | 'synced'

export type SiteAuditFindingKey =
  | ImprovementOpportunity
  | 'weak_cta'

export interface LeadComment {
  id: string
  text: string
  createdAt: string
}

export interface SiteAuditFinding {
  key: SiteAuditFindingKey
  detected: boolean
  details: string
}

export interface SiteAuditResult {
  url: string
  auditedAt: string
  findings: SiteAuditFinding[]
  summary: string
  score: number
}

export interface LeadContacts {
  emails: string[]
  phones: string[]
  telegram?: string
}

export interface LeadActivity {
  id: string
  type: ActivityType
  timestamp: string
  payload: Record<string, unknown>
}

export interface Lead {
  id: string
  name: string
  niche: string
  city: string
  source: LeadSource
  website?: string
  contacts: LeadContacts
  notes: string
  aiRecommendations?: string
  status: LeadStatus
  tags: string[]
  opportunities: ImprovementOpportunity[]
  comments: LeadComment[]
  generatedMessage?: string
  siteAudit?: SiteAuditResult
  sheetsRowIndex?: number
  createdAt: string
  updatedAt: string
  activityLog: LeadActivity[]
}

export interface NichePreset {
  id: string
  name: string
  description?: string
  isDefault: boolean
}

export interface SearchQuery {
  id: string
  niche: string
  city?: string
  source?: LeadSource
  query: string
  platform: SearchPlatform
  createdAt: string
}

export interface AnalyticsSummary {
  totalLeads: number
  byStatus: Record<LeadStatus, number>
  byNiche: Record<string, number>
  bySource: Record<LeadSource, number>
  conversionRate: number
  recentActivity: LeadActivity[]
}

export interface AppProfile {
  name: string
  businessType: string
}

export interface AppIntegrations {
  openaiApiKey?: string
  googleSheetsConnected: boolean
  googleAccessToken?: string
  googleTokenExpiry?: string
  spreadsheetId?: string
  spreadsheetUrl?: string
  lastSyncAt?: string
}

export interface AppSettings {
  profile: AppProfile
  nichePresets: NichePreset[]
  plan: PlanType
  integrations: AppIntegrations
}

export interface LeadFilters {
  search: string
  status: LeadStatus | 'all'
  niche: string
  source: LeadSource | 'all'
  tags: string[]
}

export type LeadSortField = 'name' | 'createdAt' | 'updatedAt' | 'status' | 'niche'
export type SortDirection = 'asc' | 'desc'

export interface LeadSort {
  field: LeadSortField
  direction: SortDirection
}

export interface CreateLeadInput {
  name: string
  niche: string
  city: string
  source: LeadSource
  website?: string
  contacts: LeadContacts
  notes: string
  tags: string[]
  opportunities?: ImprovementOpportunity[]
  status?: LeadStatus
  generatedMessage?: string
}

export interface UpdateLeadInput extends Partial<CreateLeadInput> {
  status?: LeadStatus
  generatedMessage?: string
  siteAudit?: SiteAuditResult
  aiRecommendations?: string
}

export interface ImportResult {
  imported: number
  skipped: number
  errors: string[]
}

/** Черновик лида в режиме автопоиска (до сохранения в базу) */
export interface AutoSearchDraftLead {
  id: string
  selected: boolean
  name: string
  niche: string
  city: string
  source: LeadSource
  website?: string
  contacts: LeadContacts
  opportunities: ImprovementOpportunity[]
  generatedMessage: string
  notes: string
}

export interface AutoSearchParams {
  niche: string
  city: string
  source: AutoSearchSource
  count: number
  linksText?: string
}
