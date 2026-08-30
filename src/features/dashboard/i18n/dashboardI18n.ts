export type Language = 'ru' | 'en'

export type DashboardI18nKey =
  | 'appName'
  | 'upgrade'
  | 'avatarLabel'
  | 'startFreeDemo'
  | 'onboardingTitle'
  | 'onboardingSubtitle'
  | 'freeDemo'
  | 'enterNiche'
  | 'findLeads'
  | 'searching'
  | 'leads'
  | 'aiEmails'
  | 'export'
  | 'plan'
  | 'free'
  | 'blocked'
  | 'warning'
  | 'company'
  | 'website'
  | 'status'
  | 'action'
  | 'generateEmail'
  | 'save'
  | 'copy'
  | 'new'
  | 'saved'
  | 'contacted'
  | 'aiEmailTitle'
  | 'niche'
  | 'email'
  | 'emailPlaceholder'
  | 'emailPreviewTitle'
  | 'emailDraftBanner'
  | 'emailRecipient'
  | 'emailSubject'
  | 'emailSignature'
  | 'edit'
  | 'leadAdded'
  | 'emailGenerated'
  | 'savedSuccessfully'
  | 'noLeadSelected'
  | 'languageRu'
  | 'languageEn'

const ru: Record<DashboardI18nKey, string> = {
  appName: 'AI Lead Hunter',
  upgrade: 'Улучшить тариф',
  avatarLabel: 'Профиль пользователя',
  startFreeDemo: 'Начать бесплатное демо',
  onboardingTitle: 'Найдите первых клиентов за 60 секунд',
  onboardingSubtitle: 'AI найдёт лидов и подготовит персональные письма',
  freeDemo: 'Бесплатное демо',
  enterNiche: 'Введите нишу или ключевое слово',
  findLeads: 'Найти лидов',
  searching: 'Поиск...',
  leads: 'Лиды',
  aiEmails: 'AI-письма',
  export: 'Экспорт',
  plan: 'Тариф',
  free: 'Бесплатный',
  blocked: 'Заблокировано',
  warning: 'Внимание',
  company: 'Компания',
  website: 'Сайт',
  status: 'Статус',
  action: 'Действие',
  generateEmail: 'Сгенерировать письмо',
  save: 'Сохранить',
  copy: 'Копировать',
  new: 'Новый',
  saved: 'Сохранено',
  contacted: 'Связались',
  aiEmailTitle: 'AI-письмо',
  niche: 'Ниша',
  email: 'Письмо',
  emailPlaceholder: 'Здесь появится текст AI-письма',
  emailPreviewTitle: '📧 Предпросмотр письма',
  emailDraftBanner:
    'AI подготовил первый вариант письма.\nПроверьте текст и при необходимости отредактируйте его перед отправкой клиенту.',
  emailRecipient: 'Кому',
  emailSubject: 'Тема',
  emailSignature: 'Подпись',
  edit: 'Редактировать',
  leadAdded: 'Лиды найдены',
  emailGenerated: 'Письмо сгенерировано',
  savedSuccessfully: 'Сохранено',
  noLeadSelected: 'Выберите лида для генерации письма',
  languageRu: 'RU',
  languageEn: 'EN',
}

const en: Record<DashboardI18nKey, string> = {
  appName: 'AI Lead Hunter',
  upgrade: 'Upgrade',
  avatarLabel: 'User profile',
  startFreeDemo: 'Start free demo',
  onboardingTitle: 'Find your first clients in 60 seconds',
  onboardingSubtitle: 'AI will find leads and generate outreach emails automatically',
  freeDemo: 'Free demo',
  enterNiche: 'Enter niche or keyword',
  findLeads: 'Find leads',
  searching: 'Searching...',
  leads: 'Leads',
  aiEmails: 'AI Emails',
  export: 'Export',
  plan: 'Plan',
  free: 'Free',
  blocked: 'Blocked',
  warning: 'Warning',
  company: 'Company',
  website: 'Website',
  status: 'Status',
  action: 'Action',
  generateEmail: 'Generate Email',
  save: 'Save',
  copy: 'Copy',
  new: 'New',
  saved: 'Saved',
  contacted: 'Contacted',
  aiEmailTitle: 'AI Email',
  niche: 'Niche',
  email: 'Email',
  emailPlaceholder: 'AI generated email text will appear here',
  emailPreviewTitle: '📧 Email preview',
  emailDraftBanner:
    'AI has prepared the first draft.\nReview and edit it before sending to the client.',
  emailRecipient: 'To',
  emailSubject: 'Subject',
  emailSignature: 'Signature',
  edit: 'Edit',
  leadAdded: 'Leads added',
  emailGenerated: 'Email generated',
  savedSuccessfully: 'Saved successfully',
  noLeadSelected: 'Select a lead to generate an email',
  languageRu: 'RU',
  languageEn: 'EN',
}

const dictionaries: Record<Language, Record<DashboardI18nKey, string>> = {
  ru,
  en,
}

export function t(language: Language, key: DashboardI18nKey): string {
  return dictionaries[language][key]
}

export type DashboardTranslate = (key: DashboardI18nKey) => string

export function createDashboardTranslate(language: Language): DashboardTranslate {
  return (key) => t(language, key)
}
