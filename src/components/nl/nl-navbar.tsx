import type { ReactNode } from 'react'
import { nlCn } from './nl-utils'

export interface NlNavbarProps {
  brand: string
  right?: ReactNode
  className?: string
}

export function NlNavbar({ brand, right, className }: NlNavbarProps) {
  return (
    <header
      className={nlCn(
        'flex h-14 items-center justify-between border-b border-[#e5e7eb] bg-white px-6',
        className,
      )}
    >
      <div className="text-base font-semibold tracking-tight text-[#111827]">{brand}</div>
      <div className="flex items-center gap-3">{right}</div>
    </header>
  )
}

export function NlAvatar({ initials = 'NL' }: { initials?: string }) {
  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eef2ff] text-xs font-semibold text-[#4338ca]"
      aria-label="Профиль пользователя"
    >
      {initials}
    </div>
  )
}
