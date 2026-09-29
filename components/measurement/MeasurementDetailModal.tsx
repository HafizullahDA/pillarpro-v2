'use client'

import { formatINR, formatDate } from '@/lib/format'
import { formatChainage } from '@/lib/calculations/measurement'
import { MeasurementEntry } from '@/lib/types/measurement'
import { BOQItem } from '@/lib/types/boq'
import { ContractRecord } from '@/lib/types/contract'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { RelatedRecordsPanel, RelatedRecordItem } from '@/components/common/RelatedRecordsPanel'

interface Props {
  entry: MeasurementEntry | null
  isOpen: boolean
  onClose: () => void
  boqItem?: BOQItem | null
  project?: { id: string; name: string; agency_name?: string | null } | null
  contract?: ContractRecord | null
}

export function MeasurementDetailModal({
  entry,
  isOpen,
  onClose,
  boqItem,
  project,
  contract,
}: Props) {
  if (!isOpen || !entry) return null

  // Build unified Related Records list
  const relatedRecords: RelatedRecordItem[] = []

  // 1. BOQ Item
  if (entry.boq_item_id) {
    relatedRecords.push({
      id: entry.boq_item_id,
      type: 'boq',
      title: boqItem ? `Item ${boqItem.item_number}: ${boqItem.description.slice(0, 45)}...` : `BOQ Item #${entry.boq_item_id.slice(0, 8)}`,
      subtitle: boqItem ? `Tender Qty: ${boqItem.tender_quantity} ${boqItem.unit} @ ₹${boqItem.awarded_rate}` : undefined,
      referenceNumber: boqItem?.item_number,
      href: project ? `/projects/${project.id}/boq/${entry.boq_item_id}` : '#',
    })
  }

  // 2. Project
  if (entry.project_id) {
    relatedRecords.push({
      id: entry.project_id,
      type: 'project',
      title: project?.name || 'Project Master Record',
      subtitle: project?.agency_name ? `Employer: ${project.agency_name}` : undefined,
      href: `/projects/${entry.project_id}`,
    })
  }

  // 3. Contract Master
  if (entry.contract_id || contract) {
    const cId = entry.contract_id || contract?.id || ''
    relatedRecords.push({
      id: cId,
      type: 'contract',
      title: contract?.agreement_number ? `Agreement: ${contract.agreement_number}` : 'Contract Master Record',
      subtitle: contract?.contract_title || 'General Conditions of Contract',
      referenceNumber: contract?.agreement_number,
      href: project ? `/projects/${project.id}/contract` : '#',
    })
  }

  // 4. RA Bill (if billed)
  if (entry.billed_in_ra_bill_id) {
    relatedRecords.push({
      id: entry.billed_in_ra_bill_id,
      type: 'ra_bill',
      title: 'Billed in Running Account Bill',
      subtitle: 'Included in cumulative realization',
      status: 'BILLED',
      href: `/ledgers/ra-bills`,
    })
  }

  // 5. Variation (if deviation/variation)
  if (entry.variation_id || (entry.deviation_order_type && entry.deviation_order_type !== 'none')) {
    relatedRecords.push({
      id: entry.variation_id || 'var-record',
      type: 'variation',
      title: `Variation Order (${entry.deviation_order_type || 'Clause 12'})`,
      subtitle: entry.is_exceeded ? 'Overrun deviation order required' : 'Sanctioned under Clause 12',
      status: entry.is_exceeded ? 'OVERRUN' : 'SANCTIONED',
      href: `/variations?projectId=${entry.project_id}`,
    })
  }

  // 6. Evidence Proofs
  relatedRecords.push({
    id: `ev-${entry.id}`,
    type: 'evidence',
    title: 'Supporting Contemporaneous Measurements & Level Sheets',
    subtitle: 'Evidence Vault verification logs',
    href: `/evidence?projectId=${entry.project_id}`,
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-base text-slate-900">
                Entry #{entry.entry_number}
              </span>
              <Badge
                label={entry.status}
                variant={
                  entry.status === 'CERTIFIED'
                    ? 'success'
                    : entry.status === 'CHECKED'
                    ? 'warning'
                    : entry.status === 'SUBMITTED'
                    ? 'default'
                    : 'neutral'
                }
              />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Electronic Measurement Book (e-MB) • Measured on {formatDate(entry.measurement_date)}
              {entry.page_number && ` • Page ${entry.page_number}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1 rounded-lg"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
          {/* Location & Chainage */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Location</span>
              <span className="font-semibold text-slate-800">{entry.location || '—'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Chainage</span>
              <span className="font-mono font-bold text-slate-900">
                {formatChainage(entry.chainage_km, entry.chainage_m)}
                {entry.chainage_end_km !== null && entry.chainage_end_km !== undefined && (
                  ` to ${formatChainage(entry.chainage_end_km, entry.chainage_end_m)}`
                )}
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Description of Work</span>
            <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 whitespace-pre-line leading-relaxed">
              {entry.description}
            </p>
          </div>

          {/* Dimensions & Quantity Math */}
          <div className="border border-slate-200 rounded-xl overflow-hidden font-mono">
            <div className="bg-slate-100 px-3 py-2 text-[10px] font-bold text-slate-700 uppercase tracking-wider font-sans">
              Dimension Calculation (Calculation Mode: {entry.calculation_mode.toUpperCase()})
            </div>
            <div className="grid grid-cols-4 p-3 bg-white text-center border-b border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">Units / No</span>
                <span className="font-bold text-slate-800">{entry.number_of_units}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">Length (L)</span>
                <span className="font-bold text-slate-800">{entry.length || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">Breadth (B)</span>
                <span className="font-bold text-slate-800">{entry.breadth || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">Depth/Height (D)</span>
                <span className="font-bold text-slate-800">{entry.depth_height || '—'}</span>
              </div>
            </div>
            <div className="p-3 bg-teal-50 flex items-center justify-between text-teal-950">
              <span className="font-sans font-bold text-xs">Calculated Quantity:</span>
              <span className="font-bold text-sm">
                {entry.calculated_quantity} {entry.unit}
              </span>
            </div>
          </div>

          {/* Cumulative & BOQ Balance */}
          <div className="grid grid-cols-3 gap-2 font-mono text-center">
            <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] text-slate-500 font-sans block">Previous Qty</span>
              <span className="font-bold text-slate-800">{entry.previous_quantity}</span>
            </div>
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-[10px] text-blue-700 font-sans block">Cumulative Qty</span>
              <span className="font-bold text-blue-900">{entry.cumulative_quantity}</span>
            </div>
            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="text-[10px] text-emerald-700 font-sans block">BOQ Balance</span>
              <span className="font-bold text-emerald-900">{entry.boq_balance_quantity}</span>
            </div>
          </div>

          {/* Signatures & Certification */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px]">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Entered By</span>
              <span className="font-semibold text-slate-800">{entry.entered_by || 'Site Engineer'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Checked By</span>
              <span className="font-semibold text-slate-800">{entry.checked_by || 'Pending Check'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Certified By</span>
              <span className="font-bold text-emerald-800">{entry.certified_by || 'Pending Certification'}</span>
            </div>
          </div>

          {/* UNIFIED RELATED RECORDS SECTION */}
          <RelatedRecordsPanel
            title="Traceable Related Records (e-MB Audit Trail)"
            records={relatedRecords}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-3 border-t border-slate-200 bg-slate-50">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
