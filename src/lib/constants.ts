export const STORAGE_KEYS = {
  LEADS: 'alh_leads',
  QUERIES: 'alh_search_queries',
  SETTINGS: 'alh_settings',
  SCHEMA_VERSION: 'alh_schema_version',
} as const

export const SCHEMA_VERSION = 16

export const APP_NAME = 'AI Lead Hunter'

export const DEFAULT_NICHE_PRESETS = [
  { id: 'speech-therapist', name: 'Логопед', description: 'Коррекция речи, занятия с детьми и взрослыми' },
  { id: 'nutritionist', name: 'Нутрициолог', description: 'Питание, составление рационов, консультации' },
  { id: 'psychologist', name: 'Психолог', description: 'Консультации, терапия, психологическая помощь' },
  { id: 'tutor', name: 'Репетитор', description: 'Подготовка к экзаменам, обучение предметам' },
  { id: 'cosmetologist', name: 'Косметолог', description: 'Уход за кожей, косметические процедуры' },
  { id: 'lawyer', name: 'Юрист', description: 'Юридические консультации, сопровождение дел' },
  { id: 'furniture', name: 'Мебельщик', description: 'Изготовление и ремонт мебели на заказ' },
  { id: 'accountant', name: 'Бухгалтер', description: 'Ведение учёта, отчётность, налоги' },
] as const

/** Пользовательские ниши — управляются в настройках, можно удалить */
export const USER_NICHE_PRESETS = [
  { id: 'web-dev', name: 'Веб-разработка', description: 'Сайты и веб-приложения' },
  { id: 'marketing', name: 'Маркетинг', description: 'SMM, контекст, SEO' },
  { id: 'design', name: 'Дизайн', description: 'UI/UX, брендинг, графика' },
] as const

export const IMPROVEMENT_OPPORTUNITIES = [
  'no_website',
  'no_booking_form',
  'no_whatsapp',
  'outdated_design',
  'no_online_booking',
] as const

export const LEAD_SOURCES = [
  'avito',
  'yandex_maps',
  '2gis',
  'vk',
  'telegram',
  'company_site',
  'other',
] as const

export const LEAD_STATUSES = [
  'draft',
  'ready_to_send',
  'new',
  'contacted',
  'no_reply',
  'replied',
  'meeting',
  'won',
  'lost',
  'archived',
] as const

export const AUTO_SEARCH_SOURCES = [
  'avito',
  'yandex_maps',
  '2gis',
  'vk',
] as const

export const SEARCH_PLATFORMS = [
  'google',
  'whatsapp',
  'vk',
  'telegram',
  'other',
] as const

export const PLAN_LIMITS = {
  free: { maxLeads: 50 },
  pro: { maxLeads: 500 },
  agency: { maxLeads: Infinity },
} as const
