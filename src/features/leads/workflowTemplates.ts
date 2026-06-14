import type { AppProfile, Lead } from '@/domain/lead'
import { getNicheLabel } from '@/i18n/ru'
import { buildSenderSignature, resolveOutreachProfile } from '@/lib/senderProfile'
import { getSafeLeadIntro } from '@/features/leads/outreachMessage'

export function buildProposalTemplate(lead: Lead, profile?: AppProfile | null): string {
  const intro = getSafeLeadIntro(lead)
  const niche = getNicheLabel(lead.niche)
  const signature = buildSenderSignature(resolveOutreachProfile(profile))

  return [
    `Коммерческое предложение для ${intro}`,
    '',
    `Ниша: ${niche}`,
    lead.city ? `Город: ${lead.city}` : null,
    '',
    'Предлагаем:',
    '• Анализ текущих процессов и точек роста',
    '• Разработка решения под ваши задачи',
    '• Внедрение и сопровождение',
    '',
    'Срок реализации: по согласованию',
    'Бюджет: обсудим после уточнения задачи',
    '',
    'Готовы созвониться и подготовить детальное КП под ваш запрос.',
    '',
    signature,
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildReviewRequestTemplate(lead: Lead, profile?: AppProfile | null): string {
  const intro = getSafeLeadIntro(lead)
  const signature = buildSenderSignature(resolveOutreachProfile(profile))

  return [
    `Здравствуйте, ${intro}!`,
    '',
    'Спасибо за сотрудничество! Буду благодарен, если оставите короткий отзыв о нашей работе — это поможет другим клиентам принять решение.',
    '',
    'Можно в свободной форме: что понравилось, какой результат получили, рекомендовали бы ли нас.',
    '',
    signature,
  ].join('\n')
}
