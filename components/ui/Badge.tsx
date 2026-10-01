import { cn } from '@/lib/utils'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const variants: Record<BadgeVariant, { bg: string; dot: string }> = {
  default: {
    bg: 'bg-blue-50/90 text-blue-700 border-blue-200/80',
    dot: 'bg-blue-500',
  },
  success: {
    bg: 'bg-emerald-50/90 text-emerald-700 border-emerald-200/80',
    dot: 'bg-emerald-500',
  },
  warning: {
    bg: 'bg-amber-50/90 text-amber-800 border-amber-200/80',
    dot: 'bg-amber-500',
  },
  danger: {
    bg: 'bg-rose-50/90 text-rose-700 border-rose-200/80',
    dot: 'bg-rose-500',
  },
  info: {
    bg: 'bg-sky-50/90 text-sky-700 border-sky-200/80',
    dot: 'bg-sky-500',
  },
  neutral: {
    bg: 'bg-slate-50/90 text-slate-600 border-slate-200/80',
    dot: 'bg-slate-400',
  },
}

export interface BadgeProps {
  label: string
  variant?: BadgeVariant
  className?: string
  dot?: boolean
}

export function Badge({ label, variant = 'default', className, dot = false }: BadgeProps) {
  const current = variants[variant] || variants.default

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold border transition-colors',
        current.bg,
        className
      )}
    >
      {dot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full mr-1.5 shrink-0', current.dot)}
          aria-hidden="true"
        />
      )}
      {label}
    </span>
  )
}
