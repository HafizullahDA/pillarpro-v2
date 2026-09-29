'use client'

import { VariationStatus, VARIATION_STATUS_CONFIG } from '@/lib/types/variations'

interface Props {
  status: VariationStatus
  className?: string
}

export function VariationStatusBadge({ status, className = '' }: Props) {
  const config = VARIATION_STATUS_CONFIG[status] || {
    label: status,
    description: '',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
  }

  return (
    <span
      title={config.description}
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border tracking-wide ${config.badgeClass} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
      {config.label}
    </span>
  )
}
