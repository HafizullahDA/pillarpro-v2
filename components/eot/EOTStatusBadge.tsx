'use client'

import { EOTStatus, EOT_STATUS_CONFIG } from '@/lib/types/eot'

interface EOTStatusBadgeProps {
  status: EOTStatus
  showFactualTerm?: boolean
}

export function EOTStatusBadge({ status, showFactualTerm = true }: EOTStatusBadgeProps) {
  const config = EOT_STATUS_CONFIG[status] || EOT_STATUS_CONFIG.DRAFT

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.badgeColor}`}>
      <span>{config.label}</span>
      {showFactualTerm && (
        <span className="text-[10px] opacity-75 font-normal border-l border-current/20 pl-1.5">
          {config.factualTerm}
        </span>
      )}
    </div>
  )
}
