import type { InputHTMLAttributes } from 'react'
import { nlCn } from './nl-utils'

export interface NlInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function NlInput({
  label,
  className,
  id,
  value,
  onChange,
  placeholder,
  disabled,
  readOnly,
  ...props
}: NlInputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[#374151]">
          {label}
        </label>
      )}
      <input
        {...props}
        id={inputId}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        className={nlCn(
          'flex h-10 w-full rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm text-[#111827]',
          'placeholder:text-[#9ca3af] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827]/10',
          readOnly && 'bg-[#f9fafb] text-[#6b7280]',
          className,
        )}
      />
    </div>
  )
}
