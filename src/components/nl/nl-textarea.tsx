import type { TextareaHTMLAttributes } from 'react'
import { nlCn } from './nl-utils'

export interface NlTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export function NlTextarea({ label, className, id, ...props }: NlTextareaProps) {
  const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={textareaId} className="text-sm font-medium text-[#374151]">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={nlCn(
          'min-h-[140px] w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111827]',
          'placeholder:text-[#9ca3af] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827]/10',
          className,
        )}
        {...props}
      />
    </div>
  )
}
