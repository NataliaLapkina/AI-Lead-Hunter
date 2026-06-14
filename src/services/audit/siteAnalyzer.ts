import type { ImprovementOpportunity, SiteAuditFinding, SiteAuditResult } from '@/domain/lead'

const CORS_PROXY = 'https://api.allorigins.win/raw?url='

const BOOKING_KEYWORDS = [
  'запис',
  'booking',
  'calendly',
  'yclients',
  'dikidi',
  'онлайн-запись',
  'online-booking',
  'записаться',
]

const CTA_KEYWORDS = [
  'заказать',
  'оставить заявку',
  'получить консультацию',
  'записаться',
  'купить',
  'связаться',
  'отправить',
  'submit',
  'contact us',
]

export async function fetchPageHtml(url: string): Promise<string> {
  const normalized = url.startsWith('http') ? url : `https://${url}`
  const res = await fetch(`${CORS_PROXY}${encodeURIComponent(normalized)}`, {
    signal: AbortSignal.timeout(15_000),
  })

  if (!res.ok) {
    throw new Error(`Не удалось загрузить сайт: ${res.status}`)
  }

  return res.text()
}

function analyzeHtml(html: string): SiteAuditFinding[] {
  const lower = html.toLowerCase()

  const hasForm = /<form[\s>]/i.test(html)
  const hasEmailInput = /type=["']email["']/i.test(html) || /name=["']email["']/i.test(html)
  const hasTelInput = /type=["']tel["']/i.test(html)
  const hasSubmit = /type=["']submit["']/i.test(html) || /<button[^>]*>/i.test(html)
  const hasBookingForm = hasForm && (hasEmailInput || hasTelInput) && hasSubmit

  const hasWhatsApp =
    lower.includes('wa.me') ||
    lower.includes('whatsapp.com') ||
    lower.includes('api.whatsapp.com')

  const hasOnlineBooking = BOOKING_KEYWORDS.some((kw) => lower.includes(kw))

  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html)
  const hasOldTags =
    /<font[\s>]/i.test(html) ||
    /<marquee[\s>]/i.test(html) ||
    /<center[\s>]/i.test(html) ||
    (/<table[\s>]/i.test(html) && (html.match(/<table/gi)?.length ?? 0) > 3)
  const outdatedDesign = !hasViewport || hasOldTags

  const hasStrongCta = CTA_KEYWORDS.some((kw) => lower.includes(kw))
  const weakCta = !hasStrongCta || !hasSubmit

  return [
    {
      key: 'no_booking_form',
      detected: !hasBookingForm,
      details: hasBookingForm
        ? 'Форма заявки обнаружена'
        : 'Форма заявки не найдена на странице',
    },
    {
      key: 'no_whatsapp',
      detected: !hasWhatsApp,
      details: hasWhatsApp
        ? 'Ссылка WhatsApp найдена'
        : 'Кнопка или ссылка WhatsApp не найдена',
    },
    {
      key: 'no_online_booking',
      detected: !hasOnlineBooking,
      details: hasOnlineBooking
        ? 'Признаки онлайн-записи найдены'
        : 'Онлайн-запись не обнаружена',
    },
    {
      key: 'outdated_design',
      detected: outdatedDesign,
      details: outdatedDesign
        ? 'Устаревшая вёрстка или отсутствует mobile viewport'
        : 'Современная базовая вёрстка',
    },
    {
      key: 'weak_cta',
      detected: weakCta,
      details: weakCta
        ? 'Слабый или неочевидный призыв к действию'
        : 'CTA-элементы обнаружены',
    },
  ]
}

export function findingsToOpportunities(
  findings: SiteAuditFinding[],
): ImprovementOpportunity[] {
  const map: Record<string, ImprovementOpportunity> = {
    no_booking_form: 'no_booking_form',
    no_whatsapp: 'no_whatsapp',
    no_online_booking: 'no_online_booking',
    outdated_design: 'outdated_design',
  }

  return findings
    .filter((f) => f.detected && f.key !== 'weak_cta')
    .map((f) => map[f.key])
    .filter(Boolean) as ImprovementOpportunity[]
}

export async function auditWebsite(url: string): Promise<SiteAuditResult> {
  if (!url.trim()) {
    throw new Error('Укажите URL сайта')
  }

  const html = await fetchPageHtml(url)
  const findings = analyzeHtml(html)
  const detectedCount = findings.filter((f) => f.detected).length
  const score = Math.max(0, Math.round(100 - detectedCount * 18))

  const issues = findings.filter((f) => f.detected).map((f) => f.details)
  const summary =
    issues.length > 0
      ? `Найдено ${issues.length} проблем: ${issues.join('; ')}`
      : 'Критичных проблем не обнаружено'

  return {
    url: url.startsWith('http') ? url : `https://${url}`,
    auditedAt: new Date().toISOString(),
    findings,
    summary,
    score,
  }
}

export async function enhanceAuditWithAI(
  apiKey: string,
  audit: SiteAuditResult,
  leadName: string,
): Promise<string> {
  const { callOpenAI } = await import('../ai/openaiClient')

  return callOpenAI(apiKey, [
    {
      role: 'system',
      content:
        'Ты эксперт по веб-маркетингу. Дай 3-4 конкретные рекомендации для бизнеса на русском. Кратко, по пунктам.',
    },
    {
      role: 'user',
      content: `Компания: ${leadName}\nURL: ${audit.url}\nПроблемы: ${audit.summary}\nДетали: ${JSON.stringify(audit.findings.filter((f) => f.detected))}`,
    },
  ])
}
