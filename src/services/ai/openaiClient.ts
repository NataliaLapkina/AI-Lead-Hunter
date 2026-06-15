const OPENAI_API = 'https://api.openai.com/v1/chat/completions'

export interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function callOpenAI(
  apiKey: string,
  messages: OpenAIChatMessage[],
  model = 'gpt-4o-mini',
): Promise<string> {
  const res = await fetch(OPENAI_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 800,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI API: ${res.status} — ${err}`)
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }

  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('OpenAI вернул пустой ответ')
  return content
}

export function normalizeOpenAIApiKey(apiKey?: string | null): string | undefined {
  if (!apiKey) return undefined

  const trimmed = apiKey.trim().replace(/^["']|["']$/g, '')
  return trimmed || undefined
}

export function hasOpenAIKey(apiKey?: string | null): boolean {
  const normalized = normalizeOpenAIApiKey(apiKey)
  if (!normalized) return false

  if (/^sk-[a-zA-Z0-9_-]{8,}$/.test(normalized)) return true

  // Fallback for non-standard but saved secrets in local settings.
  return normalized.length >= 20
}
