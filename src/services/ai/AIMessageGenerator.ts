import type { Lead } from '@/domain/lead'
import {
  buildOutreachMessage,
  collectOutreachBullets,
} from '@/features/leads/outreachMessage'
import { getOpportunityLabel } from '@/features/leads/improvements'
import { getNicheLabel } from '@/i18n/ru'
import { getSenderProfile, buildMessageSignature } from '@/lib/senderProfile'
import type { AppProfile } from '@/domain/lead'
import { callOpenAI } from './openaiClient'

export interface AIMessageInput {
  lead: Lead
  senderProfile?: Partial<AppProfile>
}

export async function generateAIMessage(
  apiKey: string,
  input: AIMessageInput,
): Promise<string> {
  const { lead, senderProfile } = input
  const sender = getSenderProfile(senderProfile)

  const checkedProblems = (lead.opportunities ?? [])
    .map((o) => getOpportunityLabel(o))
    .join('; ')

  const nicheBullets = collectOutreachBullets(lead)
  const auditSummary = lead.siteAudit?.summary ?? ''
  const referenceMessage = buildOutreachMessage(lead, sender)
  const signature = buildMessageSignature(sender)

  const system = `Ты помощник по B2B-продажам. Пишешь холодные сообщения на русском языке.

СТРОГИЕ ПРАВИЛА:
- Отправитель ВСЕГДА: ${sender.name} (женский род: изучила, заметила, подготовлю, могу показать)
- Специализация отправителя: ${sender.specialization}
- Фраза про отправителя: "Я занимаюсь ${sender.specialization}."
- ЗАПРЕЩЕНО: использовать нишу клиента как профессию отправителя (например "я занимаюсь Бухгалтер", "я логопед")
- ЗАПРЕЩЕНО: "меня зовут специалист" или любое имя кроме ${sender.name}
- ЗАПРЕЩЕНО: писать "(ниша: ...)" или "ниша:" в тексте сообщения — ниша только для внутренней персонализации
- Фраза о компании: "Изучила вашу компанию «${lead.name || '...'}» и заметила несколько точек роста:" — без упоминания ниши в скобках
- Буллеты проблем — из списка рекомендаций для клиента (2–4 пункта)
- Сохраняй структуру эталонного шаблона: приветствие → представление → специализация → изучила компанию → буллеты → последствия → предложение → аудит → подпись
- Подпись в конце ТОЧНО в таком формате (только непустые строки из списка):
${signature}
- Без эмодзи`

  const user = `Напиши персонализированное сообщение для клиента.

Данные клиента (для внутренней персонализации, не цитируй нишу в тексте):
- Компания: ${lead.name}
- Ниша: ${getNicheLabel(lead.niche)}
- Город: ${lead.city || 'не указан'}
- Сайт: ${lead.website || 'нет'}
- Отмеченные проблемы в карточке: ${checkedProblems || 'не указаны'}
- Рекомендации для буллетов (используй эти формулировки):
${nicheBullets.map((b) => `• ${b}`).join('\n')}
- Аудит сайта: ${auditSummary || 'не проводился'}
- Заметки: ${lead.notes || 'нет'}

Эталон по структуре и тону:
${referenceMessage}

Адаптируй буллеты под клиента. Не меняй имя и специализацию отправителя. Используй подпись из правил.`

  return callOpenAI(apiKey, [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ])
}
