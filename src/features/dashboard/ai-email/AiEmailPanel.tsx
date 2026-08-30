import { useEffect, useMemo, useRef, useState } from 'react'
import { NlButton, NlCard, NlCardBody, NlTextarea } from '@/components/nl'
import type { DashboardTranslate } from '@/features/dashboard/i18n/dashboardI18n'
import { parseEmailDraft } from './parseEmailDraft'

export interface AiEmailState {
  company: string
  draft: string
  subject: string
  visible: boolean
}

interface AiEmailPanelProps {
  t: DashboardTranslate
  aiEmail: AiEmailState
  onDraftChange: (draft: string) => void
  onCopy: () => void
  onSave: () => void
}

function PreviewField({ label, value, emphasized = false }: {
  label: string
  value: string
  emphasized?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280]">{label}</p>
      <p
        className={
          emphasized
            ? 'text-base font-semibold leading-6 text-[#111827]'
            : 'text-sm leading-5 text-[#111827]'
        }
      >
        {value}
      </p>
    </div>
  )
}

function EmailBody({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/).filter(Boolean)

  return (
    <div className="space-y-5">
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="text-sm leading-8 text-[#1f2937]">
          {paragraph}
        </p>
      ))}
    </div>
  )
}

export function AiEmailPanel({ t, aiEmail, onDraftChange, onCopy, onSave }: AiEmailPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsEditing(false)
  }, [aiEmail.company, aiEmail.draft])

  useEffect(() => {
    if (!aiEmail.visible) return

    const frame = window.requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [aiEmail.visible, aiEmail.company, aiEmail.draft])

  const subject = aiEmail.subject
  const { body, signature } = useMemo(() => parseEmailDraft(aiEmail.draft), [aiEmail.draft])
  const hasDraft = aiEmail.draft.trim().length > 0

  if (!aiEmail.visible) return null

  return (
    <div ref={panelRef} className="scroll-mt-6">
      <NlCard>
        <NlCardBody>
          <h3 className="text-base font-semibold text-[#111827]">{t('emailPreviewTitle')}</h3>

          <div className="rounded-lg border border-[#dbeafe] bg-[#eff6ff] px-4 py-3">
            <p className="whitespace-pre-line text-sm leading-7 text-[#1e40af]">
              {t('emailDraftBanner')}
            </p>
          </div>

          {isEditing ? (
            <NlTextarea
              label={t('email')}
              value={aiEmail.draft}
              onChange={(event) => onDraftChange(event.target.value)}
              placeholder={t('emailPlaceholder')}
              className="min-h-[220px] resize-y"
            />
          ) : (
            <div className="overflow-visible rounded-lg border border-[#e5e7eb] bg-white shadow-sm">
              <div className="space-y-5 border-b border-[#e5e7eb] bg-[#f9fafb] px-5 py-5">
                <PreviewField label={t('emailRecipient')} value={aiEmail.company} />
                <PreviewField label={t('emailSubject')} value={subject} emphasized />
              </div>

              <div className="px-5 py-6">
                {body ? (
                  <EmailBody text={body} />
                ) : (
                  <p className="text-sm leading-8 text-[#9ca3af]">{t('emailPlaceholder')}</p>
                )}

                {signature ? (
                  <div className="mt-8 space-y-2 border-t border-[#e5e7eb] pt-6">
                    <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280]">
                      {t('emailSignature')}
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-7 text-[#374151]">{signature}</p>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <NlButton
              type="button"
              variant="outline"
              onClick={onCopy}
              disabled={!hasDraft}
            >
              {t('copy')}
            </NlButton>
            <NlButton
              type="button"
              variant="outline"
              onClick={() => setIsEditing((current) => !current)}
              disabled={!hasDraft}
            >
              {t('edit')}
            </NlButton>
            <NlButton type="button" onClick={onSave} disabled={!hasDraft}>
              {t('save')}
            </NlButton>
          </div>
        </NlCardBody>
      </NlCard>
    </div>
  )
}
