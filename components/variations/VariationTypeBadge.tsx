'use client'

import { VariationType, VARIATION_TYPE_CONFIG } from '@/lib/types/variations'

interface Props {
  type: VariationType
  showClause?: boolean
  className?: string
}

export function VariationTypeBadge({ type, showClause = true, className = '' }: Props) {
  const config = VARIATION_TYPE_CONFIG[type] || {
    label: type,
    clauseRef: '',
    description: '',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
  }

  return (
    <span
      title={config.description}
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${config.badgeClass} ${className}`}
    >
      <span>{config.label}</span>
      {showClause && config.clauseRef && (
        <span className="text-[10px] opacity-75 font-mono">({config.clauseRef})</span>
      )}
    </span>
  )
}
