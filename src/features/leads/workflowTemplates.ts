import type { AppProfile, Lead } from '@/domain/lead'
import { buildSenderSignature } from '@/lib/senderProfile'
import { normalizePersonalVoice } from '@/lib/personalMessageVoice'

/** Название компании для КП — только lead.name, без outreach/audit. */
export function getWorkflowCompanyName(lead: Lead): string {
  const trimmed = lead.name?.trim()
  return trimmed || 'вашей компании'
}

export function buildProposalTemplate(lead: Lead, profile?: AppProfile | null): string {
  const companyName = getWorkflowCompanyName(lead)
  const signature = buildSenderSignature(profile)

  return normalizePersonalVoice(
    [
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
    ].join('\n'),
    profile,
  )
}

export function buildReviewRequestTemplate(_lead: Lead, profile?: AppProfile | null): string {
  const signature = buildSenderSignature(profile)

  return normalizePersonalVoice(
    [
      'Здравствуйте!',
      '',
      'Спасибо за сотрудничество.',
      'Буду благодарна, если вы оставите короткий отзыв о моей работе.',
      '',
      'Что можно написать:',
      '• что понравилось;',
      '• какой результат получили;',
      '• порекомендовали бы меня другим.',
      '',
      signature,
    ].join('\n'),
    profile,
  )
}

/** Запрещённые формулировки в клиентских сообщениях (корпоративный стиль / служебные поля). */
export const PROPOSAL_FORBIDDEN_PHRASES = [
  'Ниша:',
  'Город:',
  'наша работа',
  'нашей работе',
  'мы сделали',
  'наша компания',
  'наши специалисты',
  'мы предлагаем',
  'рекомендовали бы нас',
  'Коммерческое предложение для компании',
] as const
