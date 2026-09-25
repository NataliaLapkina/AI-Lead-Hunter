import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  RECOMMENDATION_REJECTION_REASONS,
  type RecommendationRejectionReason,
} from '@/domain/recommendations/recommendationActions'
import { useRecommendationActions } from '@/features/today/useRecommendationActions'
import { getSnoozeDateInputMin } from '@/features/today/snoozePresets'
import { ru } from '@/i18n/ru'

type ActionPanel = 'idle' | 'snooze' | 'modify' | 'reject'

export function RecommendationActionBar({
  recommendationId,
  onSuccess,
}: {
  recommendationId: string
  onSuccess: () => void
}) {
  const {
    submitting,
    actionError,
    accept,
    snoozePreset,
    snoozeDate,
    modify,
    reject,
    clearActionError,
  } = useRecommendationActions({
    recommendationId,
    onSuccess,
  })
  const [panel, setPanel] = useState<ActionPanel>('idle')
  const [decisionTitle, setDecisionTitle] = useState('')
  const [customDate, setCustomDate] = useState('')
  const [rejectionReason, setRejectionReason] =
    useState<RecommendationRejectionReason>('NOT_RELEVANT')
  const [rejectionComment, setRejectionComment] = useState('')
  const decisionTitleId = useId()
  const rejectionCommentId = useId()

  function openPanel(next: ActionPanel) {
    if (submitting) {
      return
    }

    clearActionError()
    setPanel(next)
    setDecisionTitle('')
    setCustomDate('')
    setRejectionReason('NOT_RELEVANT')
    setRejectionComment('')
  }

  function closePanel() {
    if (submitting) {
      return
    }

    clearActionError()
    setPanel('idle')
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={submitting}
          onClick={() => {
            void accept()
          }}
        >
          {ru.today.actions.accept}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={submitting}
          aria-expanded={panel === 'snooze'}
          onClick={() => openPanel(panel === 'snooze' ? 'idle' : 'snooze')}
        >
          {ru.today.actions.snooze}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={submitting}
          aria-expanded={panel === 'modify'}
          onClick={() => openPanel(panel === 'modify' ? 'idle' : 'modify')}
        >
          {ru.today.actions.modify}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={submitting}
          aria-expanded={panel === 'reject'}
          onClick={() => openPanel(panel === 'reject' ? 'idle' : 'reject')}
        >
          {ru.today.actions.reject}
        </Button>
      </div>

      {panel === 'snooze' ? (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={submitting}
              onClick={() => {
                void snoozePreset('tomorrow')
              }}
            >
              {ru.today.actions.tomorrow}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={submitting}
              onClick={() => {
                void snoozePreset('inThreeDays')
              }}
            >
              {ru.today.actions.inThreeDays}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={submitting}
              onClick={() => {
                void snoozePreset('inOneWeek')
              }}
            >
              {ru.today.actions.inOneWeek}
            </Button>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">{ru.today.actions.pickDate}</span>
              <Input
                type="date"
                value={customDate}
                min={getSnoozeDateInputMin()}
                disabled={submitting}
                onChange={(event) => setCustomDate(event.target.value)}
              />
            </label>
            <Button
              type="button"
              size="sm"
              disabled={submitting}
              onClick={() => {
                void snoozeDate(customDate)
              }}
            >
              {ru.today.actions.snoozeConfirm}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={submitting}
              onClick={closePanel}
            >
              {ru.common.cancel}
            </Button>
          </div>
        </div>
      ) : null}

      {panel === 'modify' ? (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="space-y-1">
            <label
              htmlFor={decisionTitleId}
              className="text-sm text-muted-foreground"
            >
              {ru.today.actions.decisionTitle}
            </label>
            <Textarea
              id={decisionTitleId}
              value={decisionTitle}
              disabled={submitting}
              onChange={(event) => setDecisionTitle(event.target.value)}
              rows={3}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={submitting}
              onClick={() => {
                void modify(decisionTitle)
              }}
            >
              {ru.today.actions.continue}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={submitting}
              onClick={closePanel}
            >
              {ru.common.cancel}
            </Button>
          </div>
        </div>
      ) : null}

      {panel === 'reject' ? (
        <div className="space-y-3 rounded-lg border p-3">
          <fieldset className="space-y-2" disabled={submitting}>
            {RECOMMENDATION_REJECTION_REASONS.map((reason) => (
              <label key={reason} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`reject-${recommendationId}`}
                  value={reason}
                  checked={rejectionReason === reason}
                  onChange={() => setRejectionReason(reason)}
                />
                {ru.today.rejectionReasons[reason]}
              </label>
            ))}
          </fieldset>
          {rejectionReason === 'OTHER' ? (
            <div className="space-y-1">
              <label
                htmlFor={rejectionCommentId}
                className="text-sm text-muted-foreground"
              >
                {ru.today.actions.rejectionComment}
              </label>
              <Textarea
                id={rejectionCommentId}
                value={rejectionComment}
                disabled={submitting}
                onChange={(event) => setRejectionComment(event.target.value)}
                rows={3}
              />
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={submitting}
              onClick={() => {
                void reject(rejectionReason, rejectionComment)
              }}
            >
              {ru.today.actions.reject}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={submitting}
              onClick={closePanel}
            >
              {ru.common.cancel}
            </Button>
          </div>
        </div>
      ) : null}

      {actionError ? (
        <p className="text-sm text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}
    </div>
  )
}
