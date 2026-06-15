import type {
  AICommunicationStyle,
  AIMessageGoal,
  AIMessageLength,
  AISettings,
  AITone,
  Lead,
} from '@/domain/lead'

export const AI_COMMUNICATION_STYLES: AICommunicationStyle[] = [
  'business',
  'friendly',
  'expert',
  'premium',
]

export const AI_MESSAGE_LENGTHS: AIMessageLength[] = ['short', 'medium', 'detailed']

export const AI_MESSAGE_GOALS: AIMessageGoal[] = [
  'introduction',
  'followup',
  'sell',
  'contact_request',
  'reactivation',
]

export const AI_TONES: AITone[] = ['soft', 'neutral', 'assertive']

export const DEFAULT_AI_SETTINGS: AISettings = {
  communicationStyle: 'friendly',
  messageLength: 'medium',
  messageGoal: 'introduction',
  offerTopic: 'создание сайтов, AI-боты, автоматизация бизнеса',
  useAutoSignature: true,
  tone: 'neutral',
}

export const AI_PREVIEW_SAMPLE_LEAD: Lead = {
  id: 'preview-lead',
  name: 'Студия красоты «Аура»',
  niche: 'Косметолог',
  city: 'Москва',
  source: 'yandex_maps',
  website: 'https://example-beauty.ru',
  contacts: {},
  notes: '',
  tags: [],
  opportunities: ['no_website', 'outdated_design'],
  comments: [],
  status: 'new',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  activityLog: [],
}

export const STYLE_GREETINGS: Record<AICommunicationStyle, string> = {
  business: 'Здравствуйте!',
  friendly: 'Добрый день!',
  expert: 'Здравствуйте.',
  premium: 'Добрый день.',
}

export const LENGTH_BULLET_LIMIT: Record<AIMessageLength, number> = {
  short: 2,
  medium: 3,
  detailed: 4,
}

function isCommunicationStyle(value: string): value is AICommunicationStyle {
  return AI_COMMUNICATION_STYLES.includes(value as AICommunicationStyle)
}

function isMessageLength(value: string): value is AIMessageLength {
  return AI_MESSAGE_LENGTHS.includes(value as AIMessageLength)
}

function isMessageGoal(value: string): value is AIMessageGoal {
  return AI_MESSAGE_GOALS.includes(value as AIMessageGoal)
}

function isTone(value: string): value is AITone {
  return AI_TONES.includes(value as AITone)
}

export function normalizeAISettings(
  raw?: Partial<AISettings> | null,
  fallback: AISettings = DEFAULT_AI_SETTINGS,
): AISettings {
  const communicationStyle =
    raw?.communicationStyle && isCommunicationStyle(raw.communicationStyle)
      ? raw.communicationStyle
      : fallback.communicationStyle
  const messageLength =
    raw?.messageLength && isMessageLength(raw.messageLength)
      ? raw.messageLength
      : fallback.messageLength
  const messageGoal =
    raw?.messageGoal && isMessageGoal(raw.messageGoal)
      ? raw.messageGoal
      : fallback.messageGoal
  const tone =
    raw?.tone && isTone(raw.tone) ? raw.tone : fallback.tone

  return {
    communicationStyle,
    messageLength,
    messageGoal,
    tone,
    offerTopic:
      typeof raw?.offerTopic === 'string' ? raw.offerTopic : fallback.offerTopic,
    useAutoSignature:
      typeof raw?.useAutoSignature === 'boolean'
        ? raw.useAutoSignature
        : fallback.useAutoSignature,
  }
}

export function getConsequencesLine(
  style: AICommunicationStyle,
  length: AIMessageLength,
): string {
  if (length === 'short') return ''

  switch (style) {
    case 'business':
      return 'Эти моменты могут снижать поток обращений и уровень доверия клиентов.'
    case 'expert':
      return 'На практике такие моменты часто снижают конверсию и доверие к бренду.'
    case 'premium':
      return 'Такие детали могут влиять на восприятие бренда и качество входящих обращений.'
    case 'friendly':
    default:
      return 'Эти моменты могут снижать количество обращений и доверие клиентов.'
  }
}

export function getValueLine(style: AICommunicationStyle, length: AIMessageLength): string {
  if (length === 'short') return ''

  switch (style) {
    case 'business':
      return 'Могу предложить конкретные варианты улучшений и примеры реализации.'
    case 'expert':
      return 'Могу показать точки роста, примеры решений и ожидаемый эффект.'
    case 'premium':
      return 'Готова предложить продуманные улучшения и показать релевантные кейсы.'
    case 'friendly':
    default:
      return 'Могу показать конкретные варианты улучшений и примеры решений.'
  }
}

export function getClosingLine(
  goal: AIMessageGoal,
  offerTopic: string,
  length: AIMessageLength,
  tone: AITone = 'neutral',
): string {
  const topic = offerTopic.trim()

  switch (goal) {
    case 'followup':
      if (tone === 'soft') {
        return length === 'short'
          ? 'Если удобно — буду рада вашему ответу.'
          : 'Если тема ещё актуальна — с радостью продолжу диалог.'
      }
      if (tone === 'assertive') {
        return 'Напишите, пожалуйста, когда сможете ответить — готова обсудить детали.'
      }
      return length === 'short'
        ? 'Буду рада вашему ответу.'
        : 'Если актуально — с радостью продолжу диалог и отвечу на вопросы.'
    case 'sell':
      if (tone === 'assertive') {
        return topic
          ? `Предлагаю обсудить ${topic} — покажу примеры и следующий шаг.`
          : 'Предлагаю обсудить услуги и показать примеры работ.'
      }
      return topic
        ? `Могу рассказать подробнее о ${topic} и показать примеры работ.`
        : 'Могу рассказать подробнее об услугах и показать примеры работ.'
    case 'contact_request':
      if (tone === 'soft') {
        return 'Если удобно — подскажите, когда можно коротко созвониться.'
      }
      if (tone === 'assertive') {
        return 'Давайте созвонимся на 10–15 минут — когда вам удобно?'
      }
      return 'Подскажите, когда удобно созвониться на 10–15 минут?'
    case 'reactivation':
      return tone === 'assertive'
        ? 'Готова вернуться к диалогу и предложить актуальные решения — напишите, если интересно.'
        : 'Буду рада вернуться к диалогу и предложить актуальные решения.'
    case 'introduction':
    default:
      if (tone === 'soft') {
        return length === 'short'
          ? 'Если интересно — с радостью подготовлю краткий аудит.'
          : 'Если интересно — могу подготовить краткий аудит без обязательств.'
      }
      if (tone === 'assertive') {
        return length === 'short'
          ? 'Готова подготовить краткий аудит — напишите, если актуально.'
          : 'Готова подготовить краткий аудит и показать точки роста — напишите, если актуально.'
      }
      return length === 'short'
        ? 'Если интересно — напишите, подготовлю краткий аудит.'
        : 'Если интересно — подготовлю краткий аудит без обязательств.'
  }
}

export function buildAISettingsPromptSection(settings: AISettings): string {
  const styleLines: Record<AICommunicationStyle, string> = {
    business: 'Стиль: деловой, сдержанный, без разговорных оборотов.',
    friendly: 'Стиль: дружелюбный, тёплый, но профессиональный.',
    expert: 'Стиль: экспертный, уверенный, с акцентом на пользу и результат.',
    premium: 'Стиль: премиальный, изысканный, без давления и шаблонных фраз.',
  }

  const lengthLines: Record<AIMessageLength, string> = {
    short: 'Длина: короткое сообщение (3–5 предложений, до 2 буллетов).',
    medium: 'Длина: среднее сообщение (6–9 предложений, 2–3 буллета).',
    detailed: 'Длина: подробное сообщение (10–14 предложений, до 4 буллетов).',
  }

  const goalLines: Record<AIMessageGoal, string> = {
    introduction: 'Цель: первое знакомство и мягкое предложение ценности.',
    followup: 'Цель: повторное касание после отсутствия ответа.',
    sell: 'Цель: продажа услуги с чётким описанием предложения.',
    contact_request: 'Цель: запросить удобное время для звонка или встречи.',
    reactivation: 'Цель: вернуть клиента в диалог после паузы.',
  }

  const topicLine = settings.offerTopic.trim()
    ? `Тема предложения: ${settings.offerTopic.trim()}.`
    : 'Тема предложения: не указана — опирайся на специализацию отправителя.'

  const signatureLine = settings.useAutoSignature
    ? 'В конце обязательно добавь автоподпись из правил.'
    : 'Не добавляй подпись в конце сообщения.'

  const toneLines: Record<AITone, string> = {
    soft: 'Тон: мягкий — без давления, деликатные формулировки.',
    neutral: 'Тон: нейтральный — уверенно и спокойно.',
    assertive: 'Тон: настойчивый — чёткий призыв к действию, без агрессии.',
  }

  return [
    styleLines[settings.communicationStyle],
    lengthLines[settings.messageLength],
    goalLines[settings.messageGoal],
    toneLines[settings.tone],
    topicLine,
    signatureLine,
  ].join('\n')
}
