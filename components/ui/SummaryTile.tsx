import { cn } from '@/lib/utils'

export interface SummaryTileProps {
  label: string
  value: string
  sub?: string
  accent?: 'blue' | 'emerald' | 'amber' | 'red' | 'slate'
  className?: string
}

const accentBars = {
  blue:    'bg-blue-600',
  emerald: 'bg-emerald-600',
  amber:   'bg-amber-500',
  red:     'bg-rose-500',
  slate:   'bg-slate-400',
}

export function SummaryTile({ label, value, sub, accent = 'slate', className }: SummaryTileProps) {
  return (
    <div
      className={cn(
        'relative bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 flex flex-col justify-between shadow-2xs hover:shadow-xs hover:border-slate-300/80 transition-all duration-200',
        className
      )}
    >
      {/* Sleek top indicator bar */}
      <div
        className={cn(
          'absolute top-0 left-5 right-5 h-[2px] rounded-full opacity-80',
          accentBars[accent]
        )}
      />

      <div className="pt-0.5">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
          {label}
        </p>
        <p className="mt-2 text-2xl font-black text-slate-900 tabular-nums tracking-tight font-mono">
          {value}
        </p>
      </div>

      {sub && (
        <p className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-400 truncate">
          {sub}
        </p>
      )}
    </div>
  )
}
