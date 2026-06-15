import { describe, expect, it } from 'vitest'
import { buildOutreachMessage } from '@/features/leads/outreachMessage'
import {
  AI_PREVIEW_SAMPLE_LEAD,
  buildAISettingsPromptSection,
  DEFAULT_AI_SETTINGS,
  getClosingLine,
  LENGTH_BULLET_LIMIT,
  normalizeAISettings,
} from './aiMessageSettings'

describe('normalizeAISettings', () => {
  it('returns defaults for empty input', () => {
    expect(normalizeAISettings(null)).toEqual(DEFAULT_AI_SETTINGS)
  })

  it('keeps valid values', () => {
    expect(
      normalizeAISettings({
        communicationStyle: 'premium',
        messageLength: 'short',
        messageGoal: 'sell',
        offerTopic: 'CRM-система',
        useAutoSignature: false,
      }),
    ).toEqual({
      communicationStyle: 'premium',
      messageLength: 'short',
      messageGoal: 'sell',
      offerTopic: 'CRM-система',
      useAutoSignature: false,
    })
  })
})

describe('buildAISettingsPromptSection', () => {
  it('includes style, length, goal and topic', () => {
    const prompt = buildAISettingsPromptSection({
      ...DEFAULT_AI_SETTINGS,
      communicationStyle: 'expert',
      messageGoal: 'contact_request',
      offerTopic: 'аудит сайта',
    })

    expect(prompt).toContain('экспертный')
    expect(prompt).toContain('запросить')
    expect(prompt).toContain('аудит сайта')
    expect(prompt).toContain('автоподпись')
  })

  it('omits signature instruction when disabled', () => {
    const prompt = buildAISettingsPromptSection({
      ...DEFAULT_AI_SETTINGS,
      useAutoSignature: false,
    })

    expect(prompt).toContain('Не добавляй подпись')
  })
})

describe('AI settings in outreach messages', () => {
  const profile = {
    name: 'Наталья',
    lastName: 'Лапкина',
    specialization: 'созданием сайтов',
  }

  it('limits bullets for short messages', () => {
    const message = buildOutreachMessage(AI_PREVIEW_SAMPLE_LEAD, profile, {
      messageLength: 'short',
    })
    const bulletCount = (message.match(/^• /gm) ?? []).length
    expect(bulletCount).toBeLessThanOrEqual(LENGTH_BULLET_LIMIT.short)
  })

  it('includes offer topic in message body', () => {
    const message = buildOutreachMessage(AI_PREVIEW_SAMPLE_LEAD, profile, {
      offerTopic: 'AI-боты',
      messageGoal: 'sell',
    })

    expect(message).toContain('AI-боты')
  })

  it('uses follow-up opening for repeat touch goal', () => {
    const message = buildOutreachMessage(AI_PREVIEW_SAMPLE_LEAD, profile, {
      messageGoal: 'followup',
    })

    expect(message).toContain('Писала вам ранее')
  })

  it('skips signature when auto signature is disabled', () => {
    const message = buildOutreachMessage(AI_PREVIEW_SAMPLE_LEAD, profile, {
      useAutoSignature: false,
    })

    expect(message).not.toContain('С уважением')
  })

  it('uses contact request closing', () => {
    expect(getClosingLine('contact_request', '', 'medium')).toContain('созвониться')
  })
})
