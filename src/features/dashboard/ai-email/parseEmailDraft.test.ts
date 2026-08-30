import { describe, expect, it } from 'vitest'
import { parseEmailDraft } from './parseEmailDraft'

const ruDraft = `Здравствуйте!

Меня зовут Наталья Лапкина.

С уважением,
Наталья Лапкина
AI & Digital Products`

const enDraft = `Hello!

My name is Natalia Lapkina.

Best regards,
Natalia Lapkina
AI & Digital Products`

describe('parseEmailDraft', () => {
  it('splits Russian body and signature', () => {
    const { body, signature } = parseEmailDraft(ruDraft)

    expect(body).toContain('Наталья Лапкина')
    expect(body).not.toContain('С уважением,')
    expect(signature).toBe('С уважением,\nНаталья Лапкина\nAI & Digital Products')
  })

  it('splits English body and signature', () => {
    const { body, signature } = parseEmailDraft(enDraft)

    expect(body).toContain('Natalia Lapkina')
    expect(body).not.toContain('Best regards,')
    expect(signature).toBe('Best regards,\nNatalia Lapkina\nAI & Digital Products')
  })

  it('returns full text as body when no closing is found', () => {
    const draft = 'Здравствуйте!\n\nКороткое письмо.'
    expect(parseEmailDraft(draft)).toEqual({ body: draft, signature: '' })
  })
})
