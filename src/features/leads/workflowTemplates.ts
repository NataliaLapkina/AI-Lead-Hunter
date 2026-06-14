import type { AppProfile, Lead } from '@/domain/lead'
import { getNicheLabel } from '@/i18n/ru'
import { buildSenderSignature } from '@/lib/senderProfile'

/** Название компании для КП — только lead.name, без outreach/audit. */
export function getWorkflowCompanyName(lead: Lead): string {
  const trimmed = lead.name?.trim()
  return trimmed || 'вашей компании'
}

export function buildProposalTemplate(lead: Lead, profile?: AppProfile | null): string {
  const companyName = getWorkflowCompanyName(lead)
  const niche = getNicheLabel(lead.niche)
  const signature = buildSenderSignature(profile)

  return [
    `Коммерческое предложение для компании «${companyName}»`,
    '',
    `Ниша: ${niche}`,
    lead.city?.trim() ? `Город: ${lead.city.trim()}` : null,
    '',
    'Предлагаем:',
    '• Анализ текущего сайта и точек роста',
    '• Разработку современного сайта',
    '• Автоматизацию заявок',
    '• AI-инструменты для работы с клиентами',
    '',
    'Сроки: по согласованию',
    '',
    signature,
  ]
    .filter((line) => line !== null && line !== '')
    .join('\n')
}

export function buildReviewRequestTemplate(_lead: Lead, profile?: AppProfile | null): string {
  const signature = buildSenderSignature(profile)

  return [
    'Здравствуйте!',
    '',
    'Спасибо за сотрудничество.',
    'Буду благодарна, если вы оставите короткий отзыв о нашей работе.',
    '',
    'Что можно написать:',
    '• что понравилось;',
    '• какой результат получили;',
    '• рекомендовали бы нас другим.',
    '',
    signature,
  ].join('\n')
}
