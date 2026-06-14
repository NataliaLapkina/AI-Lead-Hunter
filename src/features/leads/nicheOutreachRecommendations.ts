/** Рекомендации для буллетов в outreach-сообщениях по нишам клиента */

export const UNIVERSAL_OUTREACH_RECOMMENDATIONS = [
  'нет удобной формы заявки — часть обращений теряется',
  'слабая презентация услуг на сайте — клиенту сложно понять ценность',
  'нет онлайн-записи или быстрого способа связаться',
  'мало социальных доказательств — отзывы и кейсы не видны с первого экрана',
] as const

export const NICHE_OUTREACH_RECOMMENDATIONS: Record<string, readonly string[]> = {
  логопед: [
    'нет онлайн-записи',
    'нет отзывов родителей',
    'нет формы консультации',
  ],
  нутрициолог: [
    'нет онлайн-записи',
    'нет кейсов клиентов',
    'нет формы первичной анкеты',
  ],
  юрист: [
    'нет онлайн-консультации',
    'нет кейсов',
    'нет формы заявки',
  ],
  мебельщик: [
    'нет каталога работ',
    'нет калькулятора стоимости',
    'мало кейсов',
    'нет формы расчёта заказа',
  ],
  бухгалтер: [
    'нет списка услуг',
    'нет расчёта стоимости',
    'нет формы заявки',
  ],
}

const NICHE_ALIASES: Record<string, string> = {
  'speech-therapist': 'логопед',
  nutritionist: 'нутрициолог',
  lawyer: 'юрист',
  furniture: 'мебельщик',
  accountant: 'бухгалтер',
}

function normalizeNicheKey(niche: string): string {
  return niche.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Определяет ключ набора рекомендаций по названию или id ниши */
export function resolveNicheRecommendationKey(niche: string): string | null {
  const normalized = normalizeNicheKey(niche)
  if (!normalized) return null

  if (NICHE_OUTREACH_RECOMMENDATIONS[normalized]) {
    return normalized
  }

  for (const alias of Object.values(NICHE_ALIASES)) {
    if (normalized.includes(alias) || alias.includes(normalized)) {
      return alias
    }
  }

  for (const key of Object.keys(NICHE_OUTREACH_RECOMMENDATIONS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return key
    }
  }

  return null
}

/** Рекомендации для ниши или универсальный набор */
export function getNicheOutreachRecommendations(niche: string): string[] {
  const key = resolveNicheRecommendationKey(niche)
  if (key) {
    return [...NICHE_OUTREACH_RECOMMENDATIONS[key]]
  }
  return [...UNIVERSAL_OUTREACH_RECOMMENDATIONS]
}
