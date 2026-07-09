import type { HTMLAttributes, ReactNode } from 'react'
import { nlCn } from './nl-utils'

export interface NlCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  tone?: 'neutral' | 'warning'
}

export function NlCard({ children, className, tone = 'neutral', ...props }: NlCardProps) {
  return (
    <div
      className={nlCn(
        'rounded-xl border bg-white p-5 shadow-sm',
        tone === 'warning' ? 'border-amber-200 bg-amber-50/40' : 'border-[#e5e7eb]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function NlCardHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-[#111827]">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-[#6b7280]">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function NlCardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={nlCn('space-y-4', className)}>{children}</div>
}
