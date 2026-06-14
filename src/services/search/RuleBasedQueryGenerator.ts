import type { LeadSource, SearchPlatform, SearchQuery } from '@/domain/lead'
import { generateId } from '@/lib/utils'

export interface QueryGeneratorInput {
  niche: string
  city?: string
  source?: LeadSource
}

export interface IQueryGenerator {
  generate(input: QueryGeneratorInput): SearchQuery[]
}

const GOOGLE_OPPORTUNITY_TEMPLATES = [
  '{niche} {city} без сайта',
  '{niche} {city} instagram',
  '{niche} {city} только соцсети',
  '{niche} {city} старый сайт',
  '{niche} {city} нет онлайн записи',
]

const GOOGLE_TEMPLATES = [
  '{niche} {city} заказать',
  '{niche} компания {city}',
  '{niche} услуги {city}',
  'нужен {niche} {city}',
  '{niche} для бизнеса {city}',
  'разработка {niche} {city}',
  '{niche} студия {city}',
  '{niche} агентство {city}',
  'лучший {niche} {city}',
  'найти {niche} {city}',
]

const WHATSAPP_TEMPLATES = [
  '{niche} {city} whatsapp',
  'группа {niche} {city}',
  '{niche} услуги {city} whatsapp',
  'заказать {niche} {city}',
  'ищу {niche} {city}',
]

const VK_TEMPLATES = [
  '{niche} {city} vk',
  'сообщество {niche} {city}',
  '{niche} услуги {city} вконтакте',
  'группа {niche} {city}',
  'объявления {niche} {city}',
]

const TELEGRAM_TEMPLATES = [
  '{niche} {city} чат',
  '{niche} фриланс {city}',
  'заказы {niche} {city}',
  'бизнес {city} {niche}',
  'предприниматели {city}',
]

function fillTemplate(template: string, niche: string, city: string): string {
  return template
    .replace(/\{niche\}/g, niche)
    .replace(/\{city\}/g, city || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function createQueries(
  templates: string[],
  niche: string,
  city: string,
  platform: SearchPlatform,
  source?: LeadSource,
): SearchQuery[] {
  const now = new Date().toISOString()
  return templates.map((template) => ({
    id: generateId(),
    niche,
    city: city || undefined,
    source,
    query: fillTemplate(template, niche, city),
    platform,
    createdAt: now,
  }))
}

export class RuleBasedQueryGenerator implements IQueryGenerator {
  generate(input: QueryGeneratorInput): SearchQuery[] {
    const { niche, city = '', source } = input
    const trimmedNiche = niche.trim()
    const trimmedCity = city.trim()

    if (!trimmedNiche) return []

    const queries: SearchQuery[] = [
      ...createQueries(GOOGLE_TEMPLATES, trimmedNiche, trimmedCity, 'google', source),
      ...createQueries(GOOGLE_OPPORTUNITY_TEMPLATES, trimmedNiche, trimmedCity, 'google', source),
      ...createQueries(WHATSAPP_TEMPLATES, trimmedNiche, trimmedCity, 'whatsapp', source),
      ...createQueries(VK_TEMPLATES, trimmedNiche, trimmedCity, 'vk', source),
      ...createQueries(TELEGRAM_TEMPLATES, trimmedNiche, trimmedCity, 'telegram', source),
    ]

    return queries
  }
}

export const queryGenerator: IQueryGenerator = new RuleBasedQueryGenerator()
