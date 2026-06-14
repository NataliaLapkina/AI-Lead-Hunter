import type { Lead } from '@/domain/lead'
import { getOpportunityLabel } from '@/features/leads/improvements'
import { callOpenAI } from './openaiClient'

export interface AIMessageInput {
  lead: Lead
  profileName: string
  profileBusiness: string
}

export async function generateAIMessage(
  apiKey: string,
  input: AIMessageInput,
): Promise<string> {
  const { lead, profileName, profileBusiness } = input
  const business = profileBusiness || lead.niche

  const problems = (lead.opportunities ?? [])
    .map((o) => getOpportunityLabel(o))
    .join(', ')

  const auditSummary = lead.siteAudit?.summary ?? ''

  const system = `Ты помощник по B2B-продажам. Пиши короткие персональные сообщения на русском для холодного outreach.
Тон: дружелюбный, профессиональный, без агрессивных продаж. 4-6 предложений. Без эмодзи.`

  const user = `Напиши сообщение потенциальному клиенту.

Отправитель: ${profileName}, ${business}
Компания клиента: ${lead.name}
Ниша клиента: ${lead.niche}
Город: ${lead.city || 'не указан'}
Сайт: ${lead.website || 'нет'}
Выявленные проблемы: ${problems || 'не указаны'}
Результат аудита сайта: ${auditSummary || 'не проводился'}
Заметки: ${lead.notes || 'нет'}

Сообщение должно упомянуть конкретные проблемы и предложить помощь.`

  return callOpenAI(apiKey, [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ])
}
