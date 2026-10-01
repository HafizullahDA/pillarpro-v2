import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface StitchMetricProps {
  label: string
  value: string
  sub?: string
  trend?: {
    value: string
    isPositive?: boolean
    neutral?: boolean
  }
  icon?: ReactNode
  tone?: 'default' | 'emerald' | 'amber' | 'rose' | 'indigo'
  className?: string
  onClick?: () => void
}

const toneAccents = {
  default: {
    bar: 'bg-slate-300',
    iconWrap: 'bg-slate-100 text-slate-600',
  },
  emerald: {
    bar: 'bg-emerald-500',
    iconWrap: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
  },
  amber: {
    bar: 'bg-amber-500',
    iconWrap: 'bg-amber-50 text-amber-700 border border-amber-200/60',
  },
  rose: {
    bar: 'bg-rose-500',
    iconWrap: 'bg-rose-50 text-rose-700 border border-rose-200/60',
  },
  indigo: {
    bar: 'bg-indigo-500',
    iconWrap: 'bg-indigo-50 text-indigo-700 border border-indigo-200/60',
  },
}

export function StitchMetric({
  label,
  value,
  sub,
  trend,
  icon,
  tone = 'default',
  className,
  onClick,
}: StitchMetricProps) {
  const currentTone = toneAccents[tone]

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-xs hover:border-slate-300 active:scale-[0.99]',
        className
      )}
    >
      {/* Subtle indicator bar */}
      <div
        className={cn(
          'absolute top-0 left-5 right-5 h-[2px] rounded-full opacity-80',
          currentTone.bar
        )}
      />

      <div className="flex items-start justify-between gap-3 pt-1">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
            {label}
          </p>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono tabular-nums truncate">
            {value}
          </p>
        </div>

        {icon && (
          <div className={cn('p-2.5 rounded-xl shrink-0', currentTone.iconWrap)}>
            {icon}
          </div>
        )}
      </div>

      {(sub || trend) && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
          {sub && <span className="text-slate-500 truncate">{sub}</span>}
          {trend && (
            <span
              className={cn(
                'inline-flex items-center gap-1 font-semibold tabular-nums shrink-0',
                trend.neutral
                  ? 'text-slate-600'
                  : trend.isPositive
                  ? 'text-emerald-700'
                  : 'text-rose-700'
              )}
            >
              {trend.value}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
