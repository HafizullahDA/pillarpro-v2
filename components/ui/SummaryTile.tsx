import { cn } from '@/lib/utils'

interface SummaryTileProps {
  label: string
  value: string
  sub?: string
  accent?: 'blue' | 'emerald' | 'amber' | 'red' | 'slate'
  className?: string
}

const accents = {
  blue:    'border-l-blue-500',
  emerald: 'border-l-emerald-500',
  amber:   'border-l-amber-500',
  red:     'border-l-red-500',
  slate:   'border-l-slate-400',
}

export function SummaryTile({ label, value, sub, accent = 'slate', className }: SummaryTileProps) {
  return (
    <div className={cn('bg-white rounded-xl border border-slate-200 border-l-4 p-4 flex flex-col gap-1', accents[accent], className)}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  )
}
