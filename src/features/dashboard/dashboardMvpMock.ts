export type DashboardLeadStatus = 'new' | 'saved' | 'contacted'

export interface DashboardLead {
  id: string
  company: string
  website: string
  status: DashboardLeadStatus
}

export interface DashboardKpiState {
  leadsUsed: number
  leadsLimit: number
  aiEmailsUsed: number
  aiEmailsLimit: number
  exportAvailable: boolean
  plan: string
}

export const DEFAULT_KPI: DashboardKpiState = {
  leadsUsed: 12,
  leadsLimit: 500,
  aiEmailsUsed: 5,
  aiEmailsLimit: 200,
  exportAvailable: false,
  plan: 'Free',
}

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export function buildMockLeads(niche: string): DashboardLead[] {
  const slug = slugify(niche) || 'leads'
  const label = capitalize(niche.trim() || 'Agency')

  return [
    {
      id: `${slug}-1`,
      company: `${label} North`,
      website: `${slug}-north.example.com`,
      status: 'new',
    },
    {
      id: `${slug}-2`,
      company: `${label} Pro Studio`,
      website: `${slug}-pro.example.com`,
      status: 'new',
    },
    {
      id: `${slug}-3`,
      company: `${label} 360`,
      website: `${slug}-360.example.com`,
      status: 'new',
    },
  ]
}

export function buildMockEmail(niche: string, company: string): string {
  const topic = niche.trim() || 'your niche'

  return `Hi there,

I'm Alex — I help ${topic} businesses attract more clients through website optimization and outreach automation.

I came across ${company} and thought a quick audit could highlight 3 growth opportunities: online booking, site structure, and first-touch messaging.

Happy to share a short, no-obligation review if useful.

Best,
Alex`
}

function capitalize(value: string): string {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function getStatusLabel(status: DashboardLeadStatus): string {
  switch (status) {
    case 'new':
      return 'New'
    case 'saved':
      return 'Saved'
    case 'contacted':
      return 'Contacted'
  }
}

export function getStatusBadgeVariant(status: DashboardLeadStatus): 'new' | 'saved' | 'contacted' {
  return status
}

export function isUsageWarning(value: number, max: number): boolean {
  return max > 0 && value / max > 0.75
}
