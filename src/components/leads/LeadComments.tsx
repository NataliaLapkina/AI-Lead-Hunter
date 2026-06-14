import { useState } from 'react'
import type { LeadComment } from '@/domain/lead'
import { formatDateTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ru } from '@/i18n/ru'

interface LeadCommentsProps {
  comments: LeadComment[]
  onAddComment: (text: string) => Promise<void>
}

export function LeadComments({ comments, onAddComment }: LeadCommentsProps) {
  const [text, setText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    setIsSubmitting(true)
    try {
      await onAddComment(text.trim())
      setText('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const sorted = [...comments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={ru.leads.commentPlaceholder}
          rows={3}
        />
        <Button type="submit" size="sm" disabled={!text.trim() || isSubmitting}>
          {ru.leads.addComment}
        </Button>
      </form>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">{ru.leads.noComments}</p>
      ) : (
        <div className="space-y-3">
          {sorted.map((comment) => (
            <div key={comment.id} className="rounded-lg border bg-muted/30 p-3">
              <p className="text-sm whitespace-pre-wrap">{comment.text}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {formatDateTime(comment.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
