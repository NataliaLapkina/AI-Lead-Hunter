import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { nlCn } from './nl-utils'

export function NlTable({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={nlCn('overflow-hidden rounded-xl border border-[#e5e7eb] bg-white', className)}>
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  )
}

export function NlTableHead({ children }: { children: ReactNode }) {
  return <thead className="border-b border-[#e5e7eb] bg-[#f9fafb]">{children}</thead>
}

export function NlTableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-[#f3f4f6]">{children}</tbody>
}

export function NlTableRow(props: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className="hover:bg-[#fafafa]" {...props} />
}

export function NlTableHeaderCell(props: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={nlCn('px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#6b7280]', props.className)}
      {...props}
    />
  )
}

export function NlTableCell(props: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={nlCn('px-4 py-3 text-[#111827]', props.className)} {...props} />
}
