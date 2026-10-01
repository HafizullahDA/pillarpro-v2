import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface StitchTableProps {
  children: ReactNode
  className?: string
}

export function StitchTable({ children, className }: StitchTableProps) {
  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs',
        className
      )}
    >
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}

export function StitchTableHead({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <thead className={cn('bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500', className)}>
      {children}
    </thead>
  )
}

export function StitchTableBody({ children, className }: { children: ReactNode; className?: string }) {
  return <tbody className={cn('divide-y divide-slate-100 text-xs text-slate-700', className)}>{children}</tbody>
}

export function StitchTableRow({
  children,
  className,
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'transition-colors duration-150',
        onClick ? 'cursor-pointer hover:bg-slate-50/80' : 'hover:bg-slate-50/50',
        className
      )}
    >
      {children}
    </tr>
  )
}

export function StitchTableCell({
  children,
  className,
  align = 'left',
}: {
  children: ReactNode
  className?: string
  align?: 'left' | 'center' | 'right'
}) {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right tabular-nums',
  }[align]

  return (
    <td className={cn('px-4 py-3.5 align-middle', alignClass, className)}>
      {children}
    </td>
  )
}
