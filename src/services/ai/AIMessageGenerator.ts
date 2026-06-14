import type { Lead } from '@/domain/lead'
import {
  OUTREACH_SENDER,
  buildOutreachMessage,
} from '@/features/leads/outreachMessage'
import { getOpportunityLabel } from '@/features/leads/improvements'
import { callOpenAI } from './openaiClient'

export interface AIMessageInput {
  lead: Lead
}

export async function generateAIMessage(
  apiKey: string,
  input: AIMessageInput,
): Promise<string> {
  const { lead } = input

  const problems = (lead.opportunities ?? [])
    .map((o) => getOpportunityLabel(o))
    .join('; ')

  const auditSummary = lead.siteAudit?.summary ?? ''
  const referenceMessage = buildOutreachMessage(lead)

  const system = `Ты помощник по B2B-продажам. Пишешь холодные сообщения на русском языке.

СТРОГИЕ ПРАВИЛА:
- Отправитель ВСЕГДА: ${OUTREACH_SENDER.name} (женский род: изучила, заметила, подготовлю, могу показать)
- Специализация отправителя ТОЛЬКО: ${OUTREACH_SENDER.services.join(', ')}
- Фраза про отправителя: "Я занимаюсь ${OUTREACH_SENDER.specialization}."
- ЗАПРЕЩЕНО: использовать нишу клиента как профессию отправителя (например "я занимаюсь Бухгалтер", "я логопед")
- ЗАПРЕЩЕНО: "меня зовут специалист" или любое имя кроме ${OUTREACH_SENDER.name}
- Нишу клиента (${lead.niche}) используй только для персонализации обращения к ЕГО бизнесу
- Сохраняй структуру эталонного шаблона: приветствие → представление → специализация → изучила компанию → буллеты проблем → последствия → предложение → аудит → подпись
- 2–4 буллета с проблемами клиента
- Без эмодзи`

  const user = `Напиши персонализированное сообщение для клиента.

Данные клиента:
- Компания: ${lead.name}
- Ниша клиента (только для персонализации, НЕ профессия отправителя): ${lead.niche}
- Город: ${lead.city || 'не указан'}
- Сайт: ${lead.website || 'нет'}
- Выявленные проблемы: ${problems || 'не указаны'}
- Аудит сайта: ${auditSummary || 'не проводился'}
- Заметки: ${lead.notes || 'нет'}

Эталон по структуре и тону:
${referenceMessage}

Адаптируй буллеты под данные клиента. Не меняй имя и специализацию отправителя.`

  return callOpenAI(apiKey, [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ])
}
