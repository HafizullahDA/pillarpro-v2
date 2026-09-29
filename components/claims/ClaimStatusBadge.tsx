'use client'

import { ClaimStatus, CLAIM_STATUS_CONFIG } from '@/lib/types/claims'

interface Props {
  status: ClaimStatus
  className?: string
}

export function ClaimStatusBadge({ status, className = '' }: Props) {
  const config = CLAIM_STATUS_CONFIG[status] || {
    label: status,
    description: '',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
  }

  return (
    <span
      title={config.description}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border tracking-wide ${config.badgeClass} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
      {config.label}
    </span>
  )
}
