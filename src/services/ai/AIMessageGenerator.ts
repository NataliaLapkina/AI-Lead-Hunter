import type { Lead } from '@/domain/lead'
import {
  buildOutreachMessage,
  collectOutreachBullets,
  finalizeOutreachMessage,
  getSafeLeadIntro,
  safeLeadName,
} from '@/features/leads/outreachMessage'
import { getOpportunityLabel } from '@/features/leads/improvements'
import { getNicheLabel } from '@/i18n/ru'
import { getSenderDisplayName, buildSenderSignature, getSenderProfile } from '@/lib/senderProfile'
import type { AppProfile, AISettings } from '@/domain/lead'
import { buildAISettingsPromptSection, normalizeAISettings } from '@/lib/aiMessageSettings'
import { callOpenAI } from './openaiClient'

export interface AIMessageInput {
  lead: Lead
  senderProfile?: Partial<AppProfile>
  aiSettings?: Partial<AISettings> | null
}

export async function generateAIMessage(
  apiKey: string,
  input: AIMessageInput,
): Promise<string> {
  const { lead, senderProfile, aiSettings } = input
  const settings = normalizeAISettings(aiSettings)
  const sender = getSenderProfile(senderProfile)
  const displayName = getSenderDisplayName(sender)

  const checkedProblems = (lead.opportunities ?? [])
    .map((o) => getOpportunityLabel(o))
    .join('; ')

  const nicheBullets = collectOutreachBullets(lead)
  const auditSummary = lead.siteAudit?.summary ?? ''
  const referenceMessage = buildOutreachMessage(lead, senderProfile, settings)
  const signature = buildSenderSignature(senderProfile)
  const companyPhrase = getSafeLeadIntro(lead)
  const outreachLeadName = safeLeadName(lead)

  const system = `Ты помощник по B2B-продажам. Пишешь холодные сообщения на русском языке.

СТРОГИЕ ПРАВИЛА:
- Отправитель ВСЕГДА: ${displayName} (женский род: изучила, заметила, подготовлю, могу показать)
- Специализация отправителя: ${sender.specialization}
- Фраза про отправителя: "Я занимаюсь ${sender.specialization}."
- ЗАПРЕЩЕНО: использовать нишу клиента как профессию отправителя (например "я занимаюсь Бухгалтер", "я логопед")
- ЗАПРЕЩЕНО: "меня зовут специалист" или любое имя кроме ${displayName}
- ЗАПРЕЩЕНО: писать "(ниша: ...)" или "ниша:" в тексте сообщения — ниша только для внутренней персонализации
- ЗАПРЕЩЕНО: упоминать технические названия вида "Item 100000", "Item 100001", "Item 100002", "Item 123456" или URL компании в тексте сообщения
- ЗАПРЕЩЕНО: использовать fallback-имена вида "Нутрициолог из Авито", "Компания из VK" в тексте сообщения
- Фраза о компании: "${companyPhrase}" — без упоминания ниши в скобках
- Буллеты проблем — из списка рекомендаций для клиента (2–4 пункта)
- Сохраняй структуру эталонного шаблона: приветствие → представление → специализация → изучила компанию → буллеты → последствия → предложение → аудит${settings.useAutoSignature ? ' → подпись' : ''}
${settings.useAutoSignature ? `- Подпись в конце ТОЧНО в таком формате (только непустые строки из списка):\n${signature}` : '- Не добавляй подпись в конец сообщения'}
- ЗАПРЕЩЕНО: корпоративный стиль — "наша работа", "нашей работе", "мы сделали", "мы предлагаем", "наши специалисты", "наша компания", "рекомендовали бы нас"
- ТОЛЬКО первое лицо единственного числа (женский род): моя работа, я помогла, я подготовила, порекомендовали бы меня
- Без эмодзи

ПАРАМЕТРЫ ГЕНЕРАЦИИ:
${buildAISettingsPromptSection(settings)}`

  const user = `Напиши персонализированное сообщение для клиента.

Данные клиента (для внутренней персонализации, не цитируй нишу в тексте):
- Компания: ${outreachLeadName ?? 'не указана — не называть компанию по имени в тексте'}
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

Адаптируй буллеты под клиента. Не меняй имя и специализацию отправителя.${settings.useAutoSignature ? ' Используй подпись из правил.' : ''}`

  const generated = await callOpenAI(apiKey, [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ])

  return finalizeOutreachMessage(generated, lead, senderProfile, settings)
}
