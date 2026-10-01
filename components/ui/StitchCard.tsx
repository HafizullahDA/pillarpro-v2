import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StitchCardProps {
  children: ReactNode
  className?: string
  hoverable?: boolean
}

export function StitchCard({ children, className, hoverable = false }: StitchCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden',
        hoverable && 'transition-all duration-200 hover:shadow-xs hover:border-slate-300/90',
        className
      )}
    >
      {children}
    </div>
  )
}

interface StitchCardHeaderProps {
  title: string
  subtitle?: string
  badge?: ReactNode
  action?: ReactNode
  className?: string
}

export function StitchCardHeader({
  title,
  subtitle,
  badge,
  action,
  className,
}: StitchCardHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-4 border-b border-slate-100 bg-slate-50/40',
        className
      )}
    >
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h3>
          {badge}
        </div>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  )
}

export function StitchCardBody({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('p-5', className)}>{children}</div>
}
