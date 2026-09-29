'use client'

import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatINR, formatDate } from '@/lib/format'
import { RABillRow } from '@/app/(app)/ra-bills/RABillsClient'
import { RelatedRecordsPanel, RelatedRecordItem } from '@/components/common/RelatedRecordsPanel'

interface RABillDetailModalProps {
  bill: RABillRow | null
  open: boolean
  onClose: () => void
  onInspectSupporting?: (bill: RABillRow) => void
  onPrintCertificate?: (bill: RABillRow) => void
  onPrintEMB?: (bill: RABillRow) => void
  onCancelBill?: (bill: RABillRow) => void
  canCancel?: boolean
}

export function RABillDetailModal({
  bill,
  open,
  onClose,
  onInspectSupporting,
  onPrintCertificate,
  onPrintEMB,
  onCancelBill,
  canCancel = false,
}: RABillDetailModalProps) {
  if (!open || !bill) return null

  const isFinal = bill.bill_type === 'final'
  const isFirstAndFinal = bill.bill_type === 'first_and_final'
  const billTypeLabel = isFinal
    ? 'Final Bill'
    : isFirstAndFinal
    ? 'First & Final Bill'
    : 'Running Account (RA) Bill'

  const totalDeductions =
    bill.total_deductions ||
    (bill.tds_deducted || 0) +
      (bill.gst_tds_deducted || 0) +
      (bill.labour_cess_deducted || 0) +
      (bill.retention_amount || 0) +
      (bill.cement_recovery || 0) +
      (bill.steel_recovery || 0) +
      (bill.other_material_recovery || 0) +
      (bill.advance_payments_unmeasured || 0) +
      (bill.other_deductions || 0)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`RA Bill #${bill.bill_number} Detailed Breakdown`}
    >
      <div className="space-y-4 text-left text-xs text-slate-700">
        {/* Header Ribbon */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-slate-900 font-mono">
                Bill #{bill.bill_number}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                {billTypeLabel}
              </span>
              <Badge
                label={bill.status.replace(/_/g, ' ')}
                variant={
                  bill.status === 'fully_paid'
                    ? 'success'
                    : bill.status === 'partially_paid'
                    ? 'warning'
                    : 'default'
                }
              />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Project: <span className="font-semibold text-slate-800">{bill.projects?.name || 'Project Master'}</span>
              {bill.projects?.agency_name && ` � Employer: ${bill.projects.agency_name}`}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            {onPrintCertificate && (
              <Button
                size="sm"
                variant="secondary"
                className="text-xs"
                onClick={() => onPrintCertificate(bill)}
              >
                ?? Certificate
              </Button>
            )}
            {onPrintEMB && (
              <Button
                size="sm"
                variant="secondary"
                className="text-xs"
                onClick={() => onPrintEMB(bill)}
              >
                ?? e-MB Sheet
              </Button>
            )}
          </div>
        </div>

        {/* Financial Realization Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-center">
          <div>
            <span className="text-[10px] text-slate-400 block font-sans uppercase font-bold">Gross Certified Work</span>
            <span className="font-bold text-slate-900 text-sm">{formatINR(bill.work_certified_amount)}</span>
          </div>
          <div>
            <span className="text-[10px] text-rose-500 block font-sans uppercase font-bold">Total Deductions</span>
            <span className="font-bold text-rose-700 text-sm">-{formatINR(totalDeductions)}</span>
          </div>
          <div>
            <span className="text-[10px] text-emerald-600 block font-sans uppercase font-bold">Net Bank Received</span>
            <span className="font-bold text-emerald-800 text-sm">{formatINR(bill.net_bank_received || bill.amount_received)}</span>
          </div>
          <div>
            <span className="text-[10px] text-amber-600 block font-sans uppercase font-bold">Outstanding Balance</span>
            <span className="font-bold text-amber-800 text-sm">{formatINR(bill.outstanding_balance)}</span>
          </div>
        </div>

        {/* Itemized Deductions & Statutory Recoveries */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-100 px-3 py-2 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
            Statutory & Contractual Recoveries Schedule
          </div>
          <div className="p-3 bg-white space-y-2 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="p-2 bg-slate-50 rounded border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-sans">Retention ({bill.retention_percentage || 5}%)</span>
                <span className="font-mono font-bold text-slate-800">{formatINR(bill.retention_amount)}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-sans">Income Tax TDS (2%)</span>
                <span className="font-mono font-bold text-slate-800">{formatINR(bill.tds_deducted || 0)}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-sans">GST TDS (2%)</span>
                <span className="font-mono font-bold text-slate-800">{formatINR(bill.gst_tds_deducted || 0)}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-sans">Labour Welfare Cess (1%)</span>
                <span className="font-mono font-bold text-slate-800">{formatINR(bill.labour_cess_deducted || 0)}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-sans">Material Recovery (Cement/Steel)</span>
                <span className="font-mono font-bold text-slate-800">
                  {formatINR((bill.cement_recovery || 0) + (bill.steel_recovery || 0) + (bill.other_material_recovery || 0))}
                </span>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-sans">Other Recoveries</span>
                <span className="font-mono font-bold text-slate-800">{formatINR(bill.other_deductions || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* UNIFIED RELATED RECORDS PANEL */}
        <RelatedRecordsPanel
          title="Traceable Related Records (RA Bill Audit Trail)"
          description="Bidirectional links connecting this bill to Contract, BOQ, e-MB measurements, and payments."
          records={[
            {
              id: bill.project_id,
              type: 'project' as const,
              title: bill.projects?.name || 'Project Master Record',
              href: `/projects/${bill.project_id}`,
            },
            {
              id: `contract-${bill.project_id}`,
              type: 'contract' as const,
              title: 'Contract Agreement & Clause Terms',
              href: `/projects/${bill.project_id}/contract`,
            },
            {
              id: `boq-${bill.project_id}`,
              type: 'boq' as const,
              title: 'Schedule of Quantities (BOQ)',
              subtitle: 'Item-rate billing realization',
              status: 'BOQ',
              href: `/projects/${bill.project_id}/boq`,
            },
            {
              id: `meas-${bill.id}`,
              type: 'measurement' as const,
              title: bill.mb_number ? `Measurement Book: ${bill.mb_number}` : 'e-MB Contemporary Measurements',
              subtitle: bill.mb_page_start && bill.mb_page_end ? `Pages ${bill.mb_page_start} - ${bill.mb_page_end}` : 'Supporting measurement records',
              status: 'e-MB',
              href: `/measurement?projectId=${bill.project_id}`,
            },
            {
              id: `var-${bill.project_id}`,
              type: 'variation' as const,
              title: 'Clause 12 Variations & Deviations',
              subtitle: 'Sanctioned extra items & quantity deviation orders',
              status: 'VARIATION',
              href: `/variations?projectId=${bill.project_id}`,
            },
            {
              id: `ledger-${bill.project_id}`,
              type: 'payment' as const,
              title: 'Financial Ledger & Bank Realization',
              subtitle: `Net Bank Disbursed: ${formatINR(bill.net_bank_received || bill.amount_received)}`,
              status: 'LEDGER',
              href: `/ledgers?projectId=${bill.project_id}`,
            },
            {
              id: `claims-${bill.project_id}`,
              type: 'claim' as const,
              title: 'Contractual Claims & Disputes',
              subtitle: 'Delay damages & price escalation records',
              status: 'DISPUTE',
              href: `/claims?projectId=${bill.project_id}`,
            },
            ...(bill.document_url ? [{
              id: `doc-${bill.id}`,
              type: 'evidence' as const,
              title: 'Signed Bill / Measurement Sheet Scan',
              href: bill.document_url,
            }] : []),
          ]}
        />

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <div className="flex items-center gap-2">
            {onInspectSupporting && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onInspectSupporting(bill)}
                className="text-xs text-blue-700 hover:text-blue-800"
              >
                Inspect Itemized Measurements &rarr;
              </Button>
            )}

            {canCancel && bill.status !== 'cancelled' && bill.status !== 'rejected' && onCancelBill && (
              <Button
                size="sm"
                variant="danger"
                onClick={() => onCancelBill(bill)}
                className="text-xs"
              >
                Void / Cancel Bill
              </Button>
            )}
          </div>

          <div className="ml-auto">
            <Button size="sm" variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
