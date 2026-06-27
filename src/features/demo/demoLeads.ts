import type {
  ImprovementOpportunity,
  Lead,
  LeadSource,
  LeadStatus,
  SiteAuditFinding,
  SiteAuditResult,
} from '@/domain/lead'
import { generateId } from '@/lib/utils'

const DEMO_TAG = 'демо'

interface DemoLeadTemplate {
  id: string
  name: string
  niche: string
  city: string
  source: LeadSource
  status: LeadStatus
  website?: string
  sourceUrl?: string
  contacts: Lead['contacts']
  notes: string
  opportunities: ImprovementOpportunity[]
  audit: {
    score: number
    summary: string
    findings: SiteAuditFinding[]
  }
  daysAgo: number
}

function daysAgoIso(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

function buildSiteAudit(url: string, auditedAt: string, audit: DemoLeadTemplate['audit']): SiteAuditResult {
  return {
    url,
    auditedAt,
    score: audit.score,
    summary: audit.summary,
    findings: audit.findings,
  }
}

function buildDemoLead(template: DemoLeadTemplate): Lead {
  const createdAt = daysAgoIso(template.daysAgo)
  const updatedAt = daysAgoIso(Math.max(0, template.daysAgo - 1))
  const website = template.website ?? `https://${template.id}.example.ru`

  return {
    id: template.id,
    name: template.name,
    niche: template.niche,
    city: template.city,
    source: template.source,
    website,
    sourceUrl: template.sourceUrl,
    contacts: template.contacts,
    notes: template.notes,
    status: template.status,
    tags: [DEMO_TAG],
    opportunities: template.opportunities,
    comments: [],
    siteAudit: buildSiteAudit(website, updatedAt, template.audit),
    createdAt,
    updatedAt,
    activityLog: [
      {
        id: generateId(),
        type: 'created',
        timestamp: createdAt,
        payload: { source: template.source, demo: true },
      },
      {
        id: generateId(),
        type: 'site_audited',
        timestamp: updatedAt,
        payload: {
          summary: template.audit.summary,
          score: template.audit.score,
          demo: true,
        },
      },
    ],
  }
}

const DEMO_LEAD_TEMPLATES: DemoLeadTemplate[] = [
  {
    id: 'demo-lead-govorun',
    name: 'Студия речи «Говорун»',
    niche: 'Логопед',
    city: 'Москва',
    source: 'yandex_maps',
    status: 'new',
    sourceUrl: 'https://yandex.ru/maps/org/demo-govorun',
    contacts: {
      phone: '+7 (900) 000-00-01',
      email: 'hello@demo-govorun.example',
      telegram: '@demo_govorun',
    },
    notes: 'Демо-лид. Частная студия логопедии для детей 4–10 лет. Активные отзывы на картах, но сайт не конвертирует в запись.',
    opportunities: ['no_online_booking', 'outdated_design', 'no_whatsapp'],
    audit: {
      score: 41,
      summary: 'Сайт информативный, но без онлайн-записи и с устаревшим оформлением. Нет быстрого канала связи в WhatsApp.',
      findings: [
        {
          key: 'no_online_booking',
          detected: true,
          details: 'Нет формы или виджета онлайн-записи на консультацию',
        },
        {
          key: 'outdated_design',
          detected: true,
          details: 'Устаревший визуальный стиль и слабая мобильная версия',
        },
        {
          key: 'no_whatsapp',
          detected: true,
          details: 'WhatsApp для связи с родителями не указан',
        },
      ],
    },
    daysAgo: 5,
  },
  {
    id: 'demo-lead-balans',
    name: 'Центр питания «Баланс»',
    niche: 'Нутрициолог',
    city: 'Санкт-Петербург',
    source: 'avito',
    status: 'contacted',
    sourceUrl: 'https://www.avito.ru/demo/balans-nutrition',
    contacts: {
      phone: '+7 (900) 000-00-02',
      email: 'info@demo-balans.example',
      telegram: '@demo_balans',
    },
    notes: 'Демо-лид. Консультации по питанию и составление рационов. Объявление на Авито получает просмотры, но нет отдельного сайта.',
    opportunities: ['no_website', 'no_booking_form'],
    audit: {
      score: 28,
      summary: 'Отдельного сайта нет — клиенты уходят к конкурентам с понятной записью и кейсами.',
      findings: [
        {
          key: 'no_website',
          detected: true,
          details: 'Нет собственного сайта с описанием услуг и кейсами',
        },
        {
          key: 'no_booking_form',
          detected: true,
          details: 'Нет формы записи на первичную консультацию',
        },
      ],
    },
    daysAgo: 8,
  },
  {
    id: 'demo-lead-pravoshchit',
    name: 'Бюро «Правовой щит»',
    niche: 'Юрист',
    city: 'Казань',
    source: '2gis',
    status: 'no_reply',
    sourceUrl: 'https://2gis.ru/demo/pravovoy-shchit',
    contacts: {
      phone: '+7 (900) 000-00-03',
      email: 'office@demo-pravoshchit.example',
      vk: 'vk.com/demo_pravoshchit',
    },
    notes: 'Демо-лид. Юридическое сопровождение малого бизнеса. Первое сообщение отправлено 5 дней назад, ответа нет.',
    opportunities: ['outdated_design'],
    audit: {
      score: 52,
      summary: 'Сайт вызывает доверие, но слабые призывы к действию и нет быстрой формы заявки.',
      findings: [
        {
          key: 'weak_cta',
          detected: true,
          details: 'Нет заметной кнопки «Получить консультацию» на главной',
        },
        {
          key: 'outdated_design',
          detected: true,
          details: 'Блок услуг оформлен текстом без структуры и визуальных акцентов',
        },
      ],
    },
    daysAgo: 12,
  },
  {
    id: 'demo-lead-uchetpro',
    name: 'Услуги «Учёт Pro»',
    niche: 'Бухгалтер',
    city: 'Новосибирск',
    source: 'vk',
    status: 'meeting',
    sourceUrl: 'https://vk.com/demo_uchetpro',
    contacts: {
      phone: '+7 (900) 000-00-04',
      email: 'contact@demo-uchetpro.example',
      telegram: '@demo_uchetpro',
    },
    notes: 'Демо-лид. Бухгалтерия для ИП и малого бизнеса. Назначена встреча на следующую неделю.',
    opportunities: ['no_online_booking', 'no_whatsapp'],
    audit: {
      score: 47,
      summary: 'Услуги описаны, но запись на консультацию только по телефону. WhatsApp не используется.',
      findings: [
        {
          key: 'no_online_booking',
          detected: true,
          details: 'Нет календаря или формы записи на бесплатную консультацию',
        },
        {
          key: 'no_whatsapp',
          detected: true,
          details: 'WhatsApp не указан среди каналов связи',
        },
      ],
    },
    daysAgo: 3,
  },
  {
    id: 'demo-lead-dubok',
    name: 'Мастерская «Дубок»',
    niche: 'Мебельщик',
    city: 'Екатеринбург',
    source: 'yandex_maps',
    status: 'replied',
    sourceUrl: 'https://yandex.ru/maps/org/demo-dubok',
    contacts: {
      phone: '+7 (900) 000-00-05',
      email: 'order@demo-dubok.example',
      vk: 'vk.com/demo_dubok',
    },
    notes: 'Демо-лид. Мебель на заказ и ремонт. Клиент ответил, интересуется портфолио и сроками.',
    opportunities: ['outdated_design', 'no_booking_form'],
    audit: {
      score: 38,
      summary: 'Портфолио есть, но сайт перегружен и не показывает ценность на первом экране.',
      findings: [
        {
          key: 'outdated_design',
          detected: true,
          details: 'Главная страница выглядит устаревшей, много текста без структуры',
        },
        {
          key: 'no_booking_form',
          detected: true,
          details: 'Нет формы заявки на расчёт стоимости проекта',
        },
      ],
    },
    daysAgo: 6,
  },
  {
    id: 'demo-lead-kadr',
    name: 'Фотостудия «Кадр»',
    niche: 'Фотограф',
    city: 'Москва',
    source: 'telegram',
    status: 'ready_to_send',
    sourceUrl: 'https://t.me/demo_kadr_studio',
    contacts: {
      phone: '+7 (900) 000-00-06',
      email: 'studio@demo-kadr.example',
      telegram: '@demo_kadr_studio',
    },
    notes: 'Демо-лид. Портретная и предметная съёмка для малого бизнеса. Сообщение подготовлено, ожидает отправки.',
    opportunities: ['no_website', 'no_online_booking'],
    audit: {
      score: 33,
      summary: 'Основной канал — Telegram, но нет сайта с прайсом и примерами работ для холодного трафика.',
      findings: [
        {
          key: 'no_website',
          detected: true,
          details: 'Нет сайта-портфолио с ценами и кейсами',
        },
        {
          key: 'no_online_booking',
          detected: true,
          details: 'Нет онлайн-записи на фотосессию',
        },
      ],
    },
    daysAgo: 2,
  },
  {
    id: 'demo-lead-lens',
    name: 'Студия «Объектив»',
    niche: 'Фотограф',
    city: 'Краснодар',
    source: 'company_site',
    status: 'won',
    website: 'https://demo-obektiv.example.ru',
    contacts: {
      phone: '+7 (900) 000-00-07',
      email: 'hi@demo-obektiv.example',
      telegram: '@demo_obektiv',
    },
    notes: 'Демо-лид. Семейная и коммерческая фотография. Пример успешного лида после доработки сайта.',
    opportunities: ['no_whatsapp'],
    audit: {
      score: 71,
      summary: 'Сайт в хорошем состоянии, но можно усилить конверсию через WhatsApp и форму быстрой заявки.',
      findings: [
        {
          key: 'no_whatsapp',
          detected: true,
          details: 'WhatsApp не добавлен как быстрый канал связи',
        },
      ],
    },
    daysAgo: 20,
  },
]

export const DEMO_LEADS_COUNT = DEMO_LEAD_TEMPLATES.length

export function createDemoLeads(): Lead[] {
  return DEMO_LEAD_TEMPLATES.map(buildDemoLead)
}

export function isDemoLead(lead: Pick<Lead, 'id' | 'tags'>): boolean {
  return lead.id.startsWith('demo-lead-') || lead.tags.includes(DEMO_TAG)
}
