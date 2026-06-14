import type { AppProfile, Lead } from '@/domain/lead'
import { buildSenderSignature } from '@/lib/senderProfile'

/** Название компании для КП — только lead.name, без outreach/audit. */
export function getWorkflowCompanyName(lead: Lead): string {
  const trimmed = lead.name?.trim()
  return trimmed || 'вашей компании'
}

export function buildProposalTemplate(lead: Lead, profile?: AppProfile | null): string {
  const companyName = getWorkflowCompanyName(lead)
  const signature = buildSenderSignature(profile)

  return [
    'Здравствуйте!',
    '',
    `Я изучила компанию «${companyName}» и подготовила для вас персональное предложение.`,
    '',
    'Предлагаю:',
    '• провести анализ текущего сайта и выявить точки роста;',
    '• разработать современный сайт;',
    '• автоматизировать обработку заявок;',
    '• внедрить AI-инструменты для работы с клиентами.',
    '',
    'Сроки обсудим индивидуально — буду рада подстроиться под ваши задачи.',
    '',
    signature,
  ].join('\n')
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

/** Запрещённые формулировки в клиентском КП (корпоративный стиль / служебные поля). */
export const PROPOSAL_FORBIDDEN_PHRASES = [
  'Ниша:',
  'Город:',
  'Предлагаем:',
  'наша компания',
  'наши специалисты',
  'мы предлагаем',
  'Коммерческое предложение для компании',
] as const
