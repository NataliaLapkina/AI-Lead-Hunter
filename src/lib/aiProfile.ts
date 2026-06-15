import type { AIProfile } from '@/domain/lead'

export const DEFAULT_AI_PROFILE: AIProfile = {
  whoIAm: 'Создаю сайты, AI-ботов и автоматизации для малого бизнеса.',
  targetAudience: 'Малый бизнес, частные специалисты, эксперты.',
  advantages: 'Быстрый запуск, понятные решения, поддержка после запуска.',
}

export function normalizeAIProfile(
  raw?: Partial<AIProfile> | null,
  fallback: AIProfile = DEFAULT_AI_PROFILE,
): AIProfile {
  return {
    whoIAm: typeof raw?.whoIAm === 'string' ? raw.whoIAm : fallback.whoIAm,
    targetAudience:
      typeof raw?.targetAudience === 'string' ? raw.targetAudience : fallback.targetAudience,
    advantages: typeof raw?.advantages === 'string' ? raw.advantages : fallback.advantages,
  }
}

export function buildAIProfilePromptSection(profile: AIProfile): string {
  const lines: string[] = []

  if (profile.whoIAm.trim()) {
    lines.push(`Кто я: ${profile.whoIAm.trim()}`)
  }
  if (profile.targetAudience.trim()) {
    lines.push(`Целевая аудитория: ${profile.targetAudience.trim()}`)
  }
  if (profile.advantages.trim()) {
    lines.push(`Преимущества: ${profile.advantages.trim()}`)
  }

  if (lines.length === 0) {
    return 'Позиционирование: не указано — опирайся на специализацию отправителя.'
  }

  return ['Позиционирование отправителя:', ...lines].join('\n')
}

export function buildPositioningBlock(profile: AIProfile): string {
  const parts: string[] = []

  if (profile.whoIAm.trim()) {
    parts.push(profile.whoIAm.trim())
  }
  if (profile.targetAudience.trim()) {
    parts.push(`Работаю с: ${profile.targetAudience.trim()}`)
  }
  if (profile.advantages.trim()) {
    parts.push(`Мои преимущества: ${profile.advantages.trim()}`)
  }

  return parts.join('\n')
}
