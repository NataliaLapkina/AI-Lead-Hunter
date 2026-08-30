import type { Language } from '@/features/dashboard/i18n/dashboardI18n'

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

export interface MockUserProfile {
  firstName: string
  lastName: string
  company: string
  role: string
  email: string
}

export const MOCK_USER_PROFILE: MockUserProfile = {
  firstName: 'Наталья',
  lastName: 'Лапкина',
  company: 'AI & Digital Products',
  role: 'AI-специалист',
  email: 'example@example.com',
}

export const DEFAULT_KPI: DashboardKpiState = {
  leadsUsed: 12,
  leadsLimit: 500,
  aiEmailsUsed: 5,
  aiEmailsLimit: 200,
  exportAvailable: false,
  plan: 'free',
}

type NicheCategory = 'furniture' | 'marketer' | 'lawyer' | 'speech' | 'default'

export interface BuildMockEmailInput {
  language: Language
  niche: string
  company: string
  userProfile: MockUserProfile
}

export interface MockEmailResult {
  draft: string
  subject: string
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

function capitalize(value: string): string {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function detectNicheCategory(niche: string): NicheCategory {
  const normalized = niche.trim().toLowerCase()

  if (/мебел|furniture|кухн|шкаф/.test(normalized)) return 'furniture'
  if (/маркет|marketing|реклам|smm|таргет/.test(normalized)) return 'marketer'
  if (/юрист|lawyer|legal|адвокат|правов/.test(normalized)) return 'lawyer'
  if (/логопед|speech|дефектолог/.test(normalized)) return 'speech'

  return 'default'
}

function getProfileNames(profile: MockUserProfile, language: Language): {
  fullName: string
  roleLine: string
} {
  if (language === 'en') {
    return {
      fullName: 'Natalia Lapkina',
      roleLine: 'I create modern websites and AI automation for small businesses.',
    }
  }

  return {
    fullName: `${profile.firstName} ${profile.lastName}`,
    roleLine: 'Я занимаюсь созданием современных сайтов и AI-автоматизацией для малого бизнеса.',
  }
}

function getNicheContent(
  category: NicheCategory,
  language: Language,
  company: string,
): { observation: string; audit: string; cta: string } {
  const quotedCompany = language === 'ru' ? `«${company}»` : company

  const content: Record<NicheCategory, Record<Language, { observation: string; audit: string; cta: string }>> = {
    furniture: {
      ru: {
        observation: `заметила, что для мебельного бизнеса особенно важны удобный каталог, понятные заявки на консультацию и быстрый ответ клиенту после обращения`,
        audit: `показать, как можно улучшить подачу коллекций, форму заявки и путь клиента от просмотра каталога до записи на консультацию`,
        cta: `развитие сайта, заявок и онлайн-продаж мебели`,
      },
      en: {
        observation: `noticed that for a furniture business, a clear catalog, consultation requests, and fast follow-up are especially important`,
        audit: `show how product presentation, inquiry forms, and the path from catalog browsing to consultation booking can be improved`,
        cta: `website growth, lead capture, and online furniture sales`,
      },
    },
    marketer: {
      ru: {
        observation: `увидела возможности усилить привлечение клиентов, выстроить понятную воронку и автоматизировать первые касания`,
        audit: `предложить 2–3 шага по улучшению лидогенерации, обработки заявок и первых сообщений клиентам`,
        cta: `привлечение клиентов, воронку продаж и автоматизацию коммуникаций`,
      },
      en: {
        observation: `spotted opportunities to strengthen client acquisition, clarify the funnel, and automate first-touch outreach`,
        audit: `outline 2–3 practical steps to improve lead generation, inquiry handling, and first-touch messaging`,
        cta: `client acquisition, funnel performance, and outreach automation`,
      },
    },
    lawyer: {
      ru: {
        observation: `обратила внимание на то, как важны доверие, понятная подача услуг и удобная форма заявки для потенциальных клиентов`,
        audit: `показать, что можно улучшить в структуре услуг, формулировках и обработке обращений без перегруза юридическими терминами`,
        cta: `усиление доверия, заявок и понятной презентации юридических услуг`,
      },
      en: {
        observation: `noted how important trust, clear service presentation, and an easy inquiry flow are for potential clients`,
        audit: `highlight what can be improved in service structure, messaging, and inquiry handling without heavy legal jargon`,
        cta: `trust, inquiries, and a clearer presentation of legal services`,
      },
    },
    speech: {
      ru: {
        observation: `заметила, что для логопедической практики особенно важны запись на консультацию, понятное описание услуг и ощущение надёжности для родителей`,
        audit: `показать, как можно упростить запись, сделать услуги понятнее и усилить доверие на сайте`,
        cta: `запись на консультацию, понятность услуг и доверие родителей`,
      },
      en: {
        observation: `noticed that for a speech therapy practice, consultation booking, clear services, and parent trust are especially important`,
        audit: `show how booking, service clarity, and trust signals on the website can be improved`,
        cta: `consultation booking, service clarity, and parent trust`,
      },
    },
    default: {
      ru: {
        observation: `заметила несколько возможностей, которые могут помочь сделать первое касание с клиентами более понятным и результативным`,
        audit: `показать, что можно улучшить на сайте или в процессе обработки заявок, и предложить 2–3 конкретных решения без сложной технической терминологии`,
        cta: `развитие онлайн-присутствия и привлечение новых клиентов`,
      },
      en: {
        observation: `noticed a few opportunities that could make first-touch communication clearer and more effective`,
        audit: `show what can be improved on the website or in inquiry handling, with 2–3 practical recommendations in plain language`,
        cta: `online presence and new client acquisition`,
      },
    },
  }

  const selected = content[category][language]
  if (language === 'ru') {
    return {
      observation: `Я посмотрела информацию о компании ${quotedCompany} и ${selected.observation}`,
      audit: selected.audit,
      cta: selected.cta,
    }
  }

  return {
    observation: `I reviewed ${quotedCompany} and ${selected.observation}`,
    audit: selected.audit,
    cta: selected.cta,
  }
}

export function buildEmailSubject(company: string, language: Language): string {
  const recipient = company.trim() || (language === 'ru' ? 'вашей компании' : 'your company')

  if (language === 'ru') {
    return `Идея по развитию сайта компании «${recipient}»`
  }

  return `Website growth idea for ${recipient}`
}

export function buildMockEmail({
  language,
  niche,
  company,
  userProfile,
}: BuildMockEmailInput): MockEmailResult {
  const recipient = company.trim() || (language === 'ru' ? 'ваша компания' : 'your company')
  const category = detectNicheCategory(niche)
  const { fullName, roleLine } = getProfileNames(userProfile, language)
  const { observation, audit, cta } = getNicheContent(category, language, recipient)
  const subject = buildEmailSubject(recipient, language)

  if (language === 'ru') {
    const draft = `Здравствуйте!

Меня зовут ${fullName}. ${roleLine}

${observation}.

Могу подготовить для вас короткий бесплатный аудит: ${audit}.

Если вам актуально ${cta}, буду рада обсудить это в удобном для вас формате.

С уважением,
${fullName}
${userProfile.company}`

    return { draft, subject }
  }

  const draft = `Hello!

My name is ${fullName}. ${roleLine}

${observation}.

I can prepare a short complimentary audit for you: ${audit}.

If ${cta} is relevant for you, I would be glad to discuss it in a format that works best for you.

Best regards,
${fullName}
${userProfile.company}`

  return { draft, subject }
}

export function getStatusBadgeVariant(status: DashboardLeadStatus): 'new' | 'saved' | 'contacted' {
  return status
}

export function isUsageWarning(value: number, max: number): boolean {
  return max > 0 && value / max > 0.75
}
