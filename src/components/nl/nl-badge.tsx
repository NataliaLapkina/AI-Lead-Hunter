import { nlCn } from './nl-utils'

type NlBadgeVariant = 'neutral' | 'success' | 'warning' | 'new' | 'saved' | 'contacted'

export function NlBadge({
  children,
  variant = 'neutral',
  className,
}: {
  children: React.ReactNode
  variant?: NlBadgeVariant
  className?: string
}) {
  const variants: Record<NlBadgeVariant, string> = {
    neutral: 'bg-[#f3f4f6] text-[#374151]',
    success: 'bg-[#ecfdf5] text-[#047857]',
    warning: 'bg-[#fffbeb] text-[#b45309]',
    new: 'bg-[#eff6ff] text-[#1d4ed8]',
    saved: 'bg-[#f5f3ff] text-[#6d28d9]',
    contacted: 'bg-[#ecfdf5] text-[#047857]',
  }

  return (
    <span
      className={nlCn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
