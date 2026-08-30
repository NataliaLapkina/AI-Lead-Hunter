const CLOSING_PATTERN =
  /\n(С уважением,|С наилучшими пожеланиями,|Best regards,|Best,|Regards,|Sincerely,|Cheers,|Thanks,|Kind regards,)\s*\n/i

export interface ParsedEmailDraft {
  body: string
  signature: string
}

export function parseEmailDraft(draft: string): ParsedEmailDraft {
  const trimmed = draft.trim()
  if (!trimmed) return { body: '', signature: '' }

  const match = trimmed.match(CLOSING_PATTERN)
  if (match?.index !== undefined) {
    return {
      body: trimmed.slice(0, match.index).trim(),
      signature: trimmed.slice(match.index + 1).trim(),
    }
  }

  return { body: trimmed, signature: '' }
}
