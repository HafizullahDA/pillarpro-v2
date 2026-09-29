'use client'

import Link from 'next/link'
import { formatINR, formatDate } from '@/lib/format'

export type RelatedRecordType =
  | 'project'
  | 'contract'
  | 'boq'
  | 'measurement'
  | 'ra_bill'
  | 'payment'
  | 'event'
  | 'hindrance'
  | 'correspondence'
  | 'notice'
  | 'eot'
  | 'variation'
  | 'claim'
  | 'evidence'
  | 'labour'
  | 'machinery'
  | 'material'
  | 'expense'
  | 'security'

export interface RelatedRecordItem {
  id: string
  type: RelatedRecordType
  typeLabel?: string
  title: string
  subtitle?: string
  referenceNumber?: string
  status?: string
  statusBadgeColor?: string
  amount?: number | null
  date?: string | null
  href: string
}

interface Props {
  title?: string
  description?: string
  records: RelatedRecordItem[]
  chainMode?: boolean
  className?: string
}

const TYPE_CONFIG: Record<
  RelatedRecordType,
  {
    icon: string
    label: string
    badgeBg: string
    badgeText: string
    borderColor: string
  }
> = {
  project: {
    icon: '🏗️',
    label: 'Project Master',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    borderColor: 'border-blue-200',
  },
  contract: {
    icon: '📜',
    label: 'Contract Agreement',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    borderColor: 'border-indigo-200',
  },
  boq: {
    icon: '📊',
    label: 'BOQ Item',
    badgeBg: 'bg-slate-50',
    badgeText: 'text-slate-700',
    borderColor: 'border-slate-200',
  },
  measurement: {
    icon: '📐',
    label: 'e-MB Measurement',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-700',
    borderColor: 'border-teal-200',
  },
  ra_bill: {
    icon: '🧾',
    label: 'RA Bill',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    borderColor: 'border-emerald-200',
  },
  payment: {
    icon: '💰',
    label: 'Disbursed Payment',
    badgeBg: 'bg-green-50',
    badgeText: 'text-green-700',
    borderColor: 'border-green-200',
  },
  event: {
    icon: '⚡',
    label: 'Contract Event',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    borderColor: 'border-amber-200',
  },
  hindrance: {
    icon: '🚧',
    label: 'Hindrance (Appx 21)',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    borderColor: 'border-rose-200',
  },
  correspondence: {
    icon: '✉️',
    label: 'Correspondence Letter',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-700',
    borderColor: 'border-sky-200',
  },
  notice: {
    icon: '🚨',
    label: 'Statutory Notice',
    badgeBg: 'bg-orange-50',
    badgeText: 'text-orange-800',
    borderColor: 'border-orange-200',
  },
  eot: {
    icon: '⏱️',
    label: 'EOT Case (Form 27)',
    badgeBg: 'bg-violet-50',
    badgeText: 'text-violet-700',
    borderColor: 'border-violet-200',
  },
  variation: {
    icon: '📑',
    label: 'Variation / Deviation',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-800',
    borderColor: 'border-indigo-200',
  },
  claim: {
    icon: '⚖️',
    label: 'Contractual Claim',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-800',
    borderColor: 'border-purple-200',
  },
  evidence: {
    icon: '🗄️',
    label: 'Evidence Vault Proof',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-800',
    borderColor: 'border-slate-300',
  },
  labour: {
    icon: '👷',
    label: 'Labour Log / Muster',
    badgeBg: 'bg-yellow-50',
    badgeText: 'text-yellow-800',
    borderColor: 'border-yellow-200',
  },
  machinery: {
    icon: '🚜',
    label: 'Machinery / Plant Log',
    badgeBg: 'bg-orange-50',
    badgeText: 'text-orange-800',
    borderColor: 'border-orange-200',
  },
  material: {
    icon: '🧱',
    label: 'Material / Inventory',
    badgeBg: 'bg-lime-50',
    badgeText: 'text-lime-800',
    borderColor: 'border-lime-200',
  },
  expense: {
    icon: '💸',
    label: 'Site Expense Voucher',
    badgeBg: 'bg-stone-50',
    badgeText: 'text-stone-800',
    borderColor: 'border-stone-200',
  },
  security: {
    icon: '🛡️',
    label: 'Bank Guarantee / BG',
    badgeBg: 'bg-cyan-50',
    badgeText: 'text-cyan-800',
    borderColor: 'border-cyan-200',
  },
}

export function RelatedRecordsPanel({
  title = 'Related Records & Audit Traceability',
  description = 'Directly connected contractual, measurement, billing, and delay records.',
  records = [],
  chainMode = false,
  className = '',
}: Props) {
  if (records.length === 0) {
    return (
      <div className={`p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs ${className}`}>
        <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
          {title}
        </span>
        <p className="text-slate-400 italic text-[11px] mt-1">
          No related business records linked to this item yet.
        </p>
      </div>
    )
  }

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
        <div>
          <span className="font-bold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-1.5">
            <span>🔗</span>
            <span>{title}</span>
            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
              {records.length}
            </span>
          </span>
          {description && <p className="text-[11px] text-slate-500 mt-0.5">{description}</p>}
        </div>
      </div>

      {/* Grid of Linked Records */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {records.map((rec) => {
          const cfg = TYPE_CONFIG[rec.type] || {
            icon: '📄',
            label: rec.type,
            badgeBg: 'bg-slate-50',
            badgeText: 'text-slate-700',
            borderColor: 'border-slate-200',
          }

          return (
            <Link
              key={`${rec.type}-${rec.id}`}
              href={rec.href}
              className={`p-2.5 rounded-xl border transition-all hover:shadow-sm hover:border-blue-400 bg-white flex flex-col justify-between gap-1 group cursor-pointer ${cfg.borderColor}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${cfg.badgeBg} ${cfg.badgeText}`}
                >
                  <span>{cfg.icon}</span>
                  <span>{rec.typeLabel || cfg.label}</span>
                </span>
                {rec.status && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                    {rec.status}
                  </span>
                )}
              </div>

              <div>
                <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors block truncate">
                  {rec.referenceNumber ? `[${rec.referenceNumber}] ` : ''}
                  {rec.title}
                </span>
                {rec.subtitle && (
                  <span className="text-[11px] text-slate-500 block truncate">
                    {rec.subtitle}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 font-mono">
                {rec.date ? <span>{formatDate(rec.date)}</span> : <span>Contemporaneous Record</span>}
                {rec.amount !== undefined && rec.amount !== null ? (
                  <span className="font-bold text-slate-800">{formatINR(rec.amount)}</span>
                ) : (
                  <span className="text-blue-600 font-sans group-hover:underline">Open &rarr;</span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
