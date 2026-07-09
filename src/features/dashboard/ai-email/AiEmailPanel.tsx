import { toast } from 'sonner'
import { NlButton, NlCard, NlCardBody, NlInput, NlTextarea } from '@/components/nl'

interface AiEmailPanelProps {
  company: string
  draft: string
  onDraftChange: (draft: string) => void
}

export function AiEmailPanel({ company, draft, onDraftChange }: AiEmailPanelProps) {
  const handleCopyEmail = async () => {
    if (!draft.trim()) return
    await navigator.clipboard.writeText(draft)
  }

  const handleSaveEmail = () => {
    if (!draft.trim()) return
    toast.success('Saved successfully')
  }

  return (
    <NlCard>
      <NlCardBody>
        <NlInput label="Company" value={company} readOnly />
        <NlTextarea
          label="Email"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="AI generated email text"
        />
        <div className="flex flex-wrap gap-2">
          <NlButton variant="outline" onClick={() => void handleCopyEmail()} disabled={!draft.trim()}>
            Copy
          </NlButton>
          <NlButton onClick={handleSaveEmail} disabled={!draft.trim()}>
            Save
          </NlButton>
        </div>
      </NlCardBody>
    </NlCard>
  )
}
