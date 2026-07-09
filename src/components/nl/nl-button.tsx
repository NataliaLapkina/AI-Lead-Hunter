import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { nlCn } from './nl-utils'

type NlButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline'
type NlButtonSize = 'sm' | 'md' | 'lg'

export interface NlButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: NlButtonVariant
  size?: NlButtonSize
  children: ReactNode
}

const variantClasses: Record<NlButtonVariant, string> = {
  primary:
    'bg-[#111827] text-white hover:bg-[#1f2937] shadow-sm border border-transparent',
  secondary:
    'bg-[#f3f4f6] text-[#111827] hover:bg-[#e5e7eb] border border-transparent',
  ghost: 'bg-transparent text-[#374151] hover:bg-[#f3f4f6] border border-transparent',
  outline:
    'bg-white text-[#111827] hover:bg-[#f9fafb] border border-[#e5e7eb]',
}

const sizeClasses: Record<NlButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-10 px-5 text-sm',
}

export function NlButton({
  variant = 'primary',
  size = 'md',
  className,
  children,
  disabled,
  ...props
}: NlButtonProps) {
  return (
    <button
      type="button"
      className={nlCn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827]/20',
        'disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
