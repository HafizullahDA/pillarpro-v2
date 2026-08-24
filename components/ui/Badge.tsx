import { cn } from '@/lib/utils'

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const variants: Record<Variant, string> = {
  default:  'bg-blue-100 text-blue-700',
  success:  'bg-emerald-100 text-emerald-700',
  warning:  'bg-amber-100 text-amber-700',
  danger:   'bg-red-100 text-red-700',
  info:     'bg-sky-100 text-sky-700',
  neutral:  'bg-slate-100 text-slate-600',
}

export function Badge({ label, variant = 'default', className }: { label: string; variant?: Variant; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', variants[variant], className)}>
      {label}
    </span>
  )
}
