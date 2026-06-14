import { describe, expect, it } from 'vitest'
import type { AppProfile } from '@/domain/lead'
import { buildSenderSignature } from './senderProfile'

const fullProfile: Partial<AppProfile> = {
  name: 'Наталья',
  lastName: 'Лапкина',
  whatsapp: '+7 900 000-00-00',
  telegram: '@natalia',
  vk: 'vk.com/natalia',
  email: 'natalia@example.com',
  website: 'https://natalia.dev',
  portfolio: 'https://portfolio.example.com',
}

describe('buildSenderSignature', () => {
  it('includes full name and all filled contacts', () => {
    const signature = buildSenderSignature(fullProfile)

    expect(signature).toContain('С уважением,')
    expect(signature).toContain('Наталья Лапкина')
    expect(signature).toContain('WhatsApp: +7 900 000-00-00')
    expect(signature).toContain('Telegram: @natalia')
    expect(signature).toContain('VK: vk.com/natalia')
    expect(signature).toContain('Email: natalia@example.com')
    expect(signature).toContain('Сайт: https://natalia.dev')
    expect(signature).toContain('Портфолио: https://portfolio.example.com')
  })

  it('uses only first name when lastName is empty', () => {
    const signature = buildSenderSignature({
      name: 'Наталья',
      lastName: '',
      whatsapp: '+7 900 000-00-00',
    })

    expect(signature.split('\n')[1]).toBe('Наталья')
    expect(signature).toContain('WhatsApp: +7 900 000-00-00')
  })

  it('omits empty contact fields', () => {
    const signature = buildSenderSignature({
      name: 'Наталья',
      lastName: 'Лапкина',
    })

    expect(signature).toBe('С уважением,\nНаталья Лапкина')
    expect(signature).not.toContain('WhatsApp:')
    expect(signature).not.toContain('Telegram:')
  })

  it('builds signature from explicit profile object', () => {
    const signature = buildSenderSignature({
      name: 'Наталья',
      lastName: 'Лапкина',
      whatsapp: '+7 900 111-22-33',
    })

    expect(signature).toContain('Наталья Лапкина')
    expect(signature).toContain('WhatsApp: +7 900 111-22-33')
  })
})
