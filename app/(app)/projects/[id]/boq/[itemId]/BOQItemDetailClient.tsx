'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatINR } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { BOQItem, BOQItemRevision, BOQ_ITEM_TYPES, BOQItemType } from '@/lib/types/boq'
import { ContractRecord } from '@/lib/types/contract'
import { AddBOQRevisionModal } from './AddBOQRevisionModal'
import { NewBOQItemDrawer } from '../NewBOQItemDrawer'
import { RelatedRecordsPanel, RelatedRecordItem } from '@/components/common/RelatedRecordsPanel'

interface BOQItemDetailClientProps {
  project: {
    id: string
    name: string
    agency_name?: string | null
    awarded_amount: number
  }
  contract: ContractRecord | null
  item: BOQItem
  billingHistory: any[]
  revisions: BOQItemRevision[]
  userRole?: string | null
}

export function BOQItemDetailClient({
  project,
  contract,
  item: initialItem,
  billingHistory = [],
  revisions: initialRevisions = [],
}: BOQItemDetailClientProps) {
  const router = useRouter()
  const [item, setItem] = useState<BOQItem>(initialItem)
  const [revisions, setRevisions] = useState<BOQItemRevision[]>(initialRevisions)
  const [revisionModalOpen, setRevisionModalOpen] = useState(false)
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)

  // Calculations
  const contractQty = Number(item.tender_quantity) || 0
  const contractRate = Number(item.awarded_rate) || 0
  const contractAmount = Math.round(contractQty * contractRate * 100) / 100

  const currentQty = Number(item.revised_quantity ?? item.tender_quantity)
  const currentRate = Number(item.revised_rate ?? item.awarded_rate)

  // Billed quantities from RA bills
  const totalBilledQty = useMemo(() => {
    if (billingHistory.length === 0) return Number(item.billed_quantity || 0)
    return billingHistory.reduce((sum, row) => sum + Number(row.current_quantity || 0), 0)
  }, [billingHistory, item.billed_quantity])

  // Certified quantity from approved/certified bills
  const totalCertifiedQty = useMemo(() => {
    if (item.certified_quantity !== undefined && item.certified_quantity !== null) {
      return Number(item.certified_quantity)
    }
    return billingHistory
      .filter((r) => r.ra_bills?.status === 'approved' || r.ra_bills?.status === 'certified')
      .reduce((sum, row) => sum + Number(row.current_quantity || 0), 0)
  }, [billingHistory, item.certified_quantity])

  // Measured quantity from measurement entries or billed
  const measuredQty = Number(item.measured_quantity ?? totalBilledQty)
  const balanceQty = Math.round((currentQty - totalBilledQty) * 1000) / 1000
  const executedAmount = Math.round(totalBilledQty * currentRate * 100) / 100
  const balanceAmount = Math.round(Math.max(0, balanceQty) * currentRate * 100) / 100

  // Deviations / Extra quantities
  const variationQty = Number(
    item.variation_quantity ??
      (item.revised_quantity ? item.revised_quantity - item.tender_quantity : 0)
  )
  const extraQty = Number(
    item.extra_quantity ??
      (item.item_type === 'extra_item' ? (item.revised_quantity ?? item.tender_quantity) : 0)
  )

  const workDonePct =
    currentQty > 0
      ? Math.min(100, Math.round((totalBilledQty / currentQty) * 1000) / 10)
      : 0

  const itemTypeMeta = BOQ_ITEM_TYPES.find((t) => t.id === item.item_type) || {
    id: item.item_type as BOQItemType,
    label: item.item_type || 'Original BOQ',
    description: '',
  }

  const handleRevisionSaved = (rev: BOQItemRevision, updatedFields: Partial<BOQItem>) => {
    setRevisions((prev) => [rev, ...prev])
    setItem((prev) => ({ ...prev, ...updatedFields }))
    router.refresh()
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
        <Link href={`/projects/${project.id}`} className="hover:text-slate-900 transition-colors">
          ← {project.name}
        </Link>
        <span>/</span>
        <Link
          href={`/projects/${project.id}/boq`}
          className="hover:text-slate-900 transition-colors"
        >
          Bill of Quantities (BOQ)
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-semibold font-mono">
          Item {item.item_number}
        </span>
      </div>

      {/* Item Cockpit Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-mono font-bold px-2.5 py-0.5 rounded-lg bg-slate-900 text-white shadow-xs">
              Item {item.item_number}
            </span>

            {/* Item Type Badge */}
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-md border ${
                item.item_type === 'extra_item'
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : item.item_type === 'deviation'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : item.item_type === 'variation'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : item.item_type === 'substituted_item'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : item.item_type === 'non_schedule'
                  ? 'bg-orange-50 text-orange-700 border-orange-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {itemTypeMeta.label}
            </span>

            {/* Chapter */}
            {item.chapter && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                Chapter: {item.chapter}
              </span>
            )}

            {/* Schedule Reference */}
            {item.schedule_reference && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                {item.schedule_reference}
              </span>
            )}

            {/* Status */}
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                item.status === 'completed'
                  ? 'bg-emerald-100 text-emerald-800'
                  : item.status === 'disputed'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {String(item.status || 'active').toUpperCase()}
            </span>
          </div>

          <h1 className="text-base md:text-lg font-bold text-slate-900 leading-snug">
            {item.description}
          </h1>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
            {contract ? (
              <Link
                href={`/projects/${project.id}/contract`}
                className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
              >
                <span>📜 Contract: {contract.agreement_number || 'Contract Master'}</span>
              </Link>
            ) : (
              <span>Project: {project.name}</span>
            )}
            {project.agency_name && <span>&bull; Dept: {project.agency_name}</span>}
            {item.department_item_code && (
              <span>&bull; Dept Code: <strong className="font-mono text-slate-700">{item.department_item_code}</strong></span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setEditDrawerOpen(true)}
            className="text-xs font-semibold"
          >
            Edit Specifications
          </Button>
          <Button
            size="sm"
            onClick={() => setRevisionModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
          >
            + Record Deviation / Variation
          </Button>
        </div>
      </div>

      {/* 11 KPI CARDS REQUIRED BY SPECIFICATION */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {/* 1. Contract Quantity */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Contract Quantity
          </p>
          <p className="text-lg font-bold text-slate-900 mt-1 tabular-nums">
            {contractQty.toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Original tender quantity</p>
        </div>

        {/* 2. Measured Quantity */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Measured Quantity
          </p>
          <p className="text-lg font-bold text-slate-900 mt-1 tabular-nums">
            {measuredQty.toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Recorded in e-MB / Site</p>
        </div>

        {/* 3. Certified Quantity */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Certified Quantity
          </p>
          <p className="text-lg font-bold text-indigo-700 mt-1 tabular-nums">
            {totalCertifiedQty.toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Approved in RA bills</p>
        </div>

        {/* 4. Billed Quantity */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Billed Quantity
          </p>
          <p className="text-lg font-bold text-emerald-700 mt-1 tabular-nums">
            {totalBilledQty.toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{workDonePct}% of effective qty</p>
        </div>

        {/* 5. Balance Quantity */}
        <div className={`bg-white rounded-xl border p-4 shadow-xs ${balanceQty < 0 ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Balance Quantity
            </p>
            {balanceQty < 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">
                Excess Executed
              </span>
            )}
          </div>
          <p className={`text-lg font-bold mt-1 tabular-nums ${balanceQty < 0 ? 'text-amber-700' : 'text-slate-900'}`}>
            {balanceQty.toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Remaining to execute</p>
        </div>

        {/* 6. Variation Quantity */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Variation Quantity
          </p>
          <p className="text-lg font-bold text-blue-700 mt-1 tabular-nums">
            {variationQty > 0 ? `+${variationQty.toLocaleString('en-IN')}` : variationQty.toLocaleString('en-IN')}{' '}
            <span className="text-xs font-normal text-slate-500">{item.unit}</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Deviation from tender</p>
        </div>

        {/* 7. Extra Quantity */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Extra Quantity
          </p>
          <p className="text-lg font-bold text-purple-700 mt-1 tabular-nums">
            {extraQty.toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Non-schedule / Extra</p>
        </div>

        {/* 8. Current Rate */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Current Rate
          </p>
          <p className="text-lg font-bold text-slate-900 mt-1 tabular-nums">
            ₹{currentRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {item.revised_rate ? `Revised (Orig: ₹${contractRate})` : 'Awarded contract rate'}
          </p>
        </div>

        {/* 9. Contract Amount */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Contract Amount
          </p>
          <p className="text-lg font-bold text-slate-900 mt-1 tabular-nums">
            {formatINR(contractAmount)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Original tender value</p>
        </div>

        {/* 10. Executed Amount */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Executed Amount
          </p>
          <p className="text-lg font-bold text-emerald-700 mt-1 tabular-nums">
            {formatINR(executedAmount)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Billed via RA bills</p>
        </div>

        {/* 11. Balance Amount */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Balance Amount
          </p>
          <p className="text-lg font-bold text-slate-900 mt-1 tabular-nums">
            {formatINR(balanceAmount)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Remaining financial value</p>
        </div>

        {/* 12. Physical Progress Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Execution Progress
            </p>
            <span className="text-xs font-bold text-slate-900">{workDonePct}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                workDonePct >= 100 ? 'bg-emerald-600' : 'bg-slate-900'
              }`}
              style={{ width: `${Math.min(100, workDonePct)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            {currentQty > 0
              ? `${totalBilledQty.toLocaleString('en-IN')} / ${currentQty.toLocaleString('en-IN')} ${item.unit}`
              : 'Quantity pending'}
          </p>
        </div>
      </div>

      {/* Technical Specifications & Schedule Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
        <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <span>📐 Technical Specifications & Schedule Reference</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[11px] text-slate-400 font-semibold uppercase block mb-1">
              Schedule / SOR Reference
            </span>
            <p className="font-semibold text-slate-800">
              {item.schedule_reference || 'Tender Non-Schedule / Custom BOQ'}
            </p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[11px] text-slate-400 font-semibold uppercase block mb-1">
              Department Item Code
            </span>
            <p className="font-semibold text-slate-800 font-mono">
              {item.department_item_code || item.item_number}
            </p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[11px] text-slate-400 font-semibold uppercase block mb-1">
              Unit of Measurement
            </span>
            <p className="font-semibold text-slate-800 uppercase">
              {item.unit}
            </p>
          </div>
        </div>

        {item.detailed_specification && (
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[11px] text-slate-400 font-semibold uppercase block mb-1">
              Detailed Engineering Specification
            </span>
            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-200/50">
              {item.detailed_specification}
            </p>
          </div>
        )}

        {item.notes && (
          <div className="pt-1">
            <span className="text-[11px] text-slate-400 font-semibold uppercase block mb-1">
              Engineer Notes / Observations
            </span>
            <p className="text-xs text-slate-600 bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/50">
              {item.notes}
            </p>
          </div>
        )}
      </div>

      {/* Measurement & RA Billing History Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>📊 Measurement & RA Billing History</span>
              <span className="text-xs font-normal text-slate-500">
                ({billingHistory.length} bill entries)
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cumulative measurements certified across Running Account bills for this item
            </p>
          </div>
          <Link
            href={`/projects/${project.id}/ra-bills`}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
          >
            View All RA Bills →
          </Link>
        </div>

        {billingHistory.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
            <p className="text-xs text-slate-500 font-medium">
              No measurements have been billed for this item yet.
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              When this item is included in an RA Bill, every measurement and payment status will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">RA Bill #</th>
                  <th className="p-3">Bill Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Previous Qty</th>
                  <th className="p-3 text-right">Current Qty</th>
                  <th className="p-3 text-right">Cumulative Qty</th>
                  <th className="p-3 text-right">Rate</th>
                  <th className="p-3 text-right">Current Amount</th>
                  <th className="p-3 text-right">Cumulative Amount</th>
                  <th className="p-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {billingHistory.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3 font-semibold text-slate-900">
                      <Link
                        href={`/projects/${project.id}/ra-bills/${row.ra_bill_id}`}
                        className="text-blue-600 hover:underline font-mono"
                      >
                        {row.ra_bills?.bill_number || 'RA Bill'}
                      </Link>
                    </td>
                    <td className="p-3 text-slate-500">
                      {row.ra_bills?.submission_date || '—'}
                    </td>
                    <td className="p-3">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                        {row.ra_bills?.status || 'draft'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono text-slate-600">
                      {Number(row.previous_quantity || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-700">
                      {Number(row.current_quantity || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-right font-mono font-semibold text-slate-900">
                      {Number(row.cumulative_quantity || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-600">
                      ₹{Number(row.rate || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-right font-mono font-semibold text-emerald-700">
                      {formatINR(row.current_amount || 0)}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      {formatINR(row.cumulative_amount || 0)}
                    </td>
                    <td className="p-3 text-slate-500 max-w-xs truncate">
                      {row.remarks || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {/* UNIFIED RELATED RECORDS AUDIT TRAIL */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <RelatedRecordsPanel
          title="Unified Traceable Related Records (BOQ Item Audit Trail)"
          description="Connected contractual, measurement, billing, variation, and delay defense records."
          records={[
            {
              id: project.id,
              type: 'project' as const,
              title: project.name,
              subtitle: project.agency_name ? `Employer: ${project.agency_name}` : undefined,
              href: `/projects/${project.id}`,
            },
            ...(contract ? [{
              id: contract.id,
              type: 'contract' as const,
              title: `Agreement: ${contract.agreement_number}`,
              subtitle: contract.contract_title || undefined,
              href: `/projects/${project.id}/contract`,
            }] : []),
            {
              id: `meas-${item.id}`,
              type: 'measurement' as const,
              title: 'Electronic Measurements (e-MB)',
              subtitle: `Cumulative Measured: ${measuredQty} ${item.unit}`,
              status: 'e-MB',
              href: `/measurement?projectId=${project.id}`,
            },
            {
              id: `bills-${item.id}`,
              type: 'ra_bill' as const,
              title: 'Running Account Billing History',
              subtitle: `Cumulative Billed: ${totalBilledQty} ${item.unit} (${formatINR(executedAmount)})`,
              status: 'RA BILL',
              href: `/ledgers/ra-bills?projectId=${project.id}`,
            },
            {
              id: `vars-${item.id}`,
              type: 'variation' as const,
              title: 'Clause 12 Deviations & Extra Items',
              subtitle: `Net Variation Qty: ${variationQty > 0 ? '+' : ''}${variationQty} ${item.unit}`,
              status: 'VARIATION',
              href: `/variations?projectId=${project.id}`,
            },
            {
              id: `defense-${item.id}`,
              type: 'hindrance' as const,
              title: 'Contract Defense & Delay Hindrances',
              subtitle: 'Contemporaneous hindrance records affecting this item',
              href: `/hindrances?projectId=${project.id}`,
            },
            {
              id: `ledger-${item.id}`,
              type: 'payment' as const,
              title: 'Financial Ledger & Realization',
              subtitle: 'Passed bill payments and contractor ledger receipts',
              href: `/ledgers?projectId=${project.id}`,
            },
          ]}
        />
      </div>

      {/* Deviations, Variations & Rate Revision History */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>📝 Quantity & Rate Revision History (Deviations / Variations)</span>
              <span className="text-xs font-normal text-slate-500">
                ({revisions.length} records)
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Auditable log of departmental deviation sanctions, extra item orders, and rate revisions
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setRevisionModalOpen(true)}
            className="text-xs font-semibold bg-slate-900 text-white"
          >
            + Add Revision Record
          </Button>
        </div>

        {revisions.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
            <p className="text-xs text-slate-500 font-medium">
              No quantity deviations or rate revisions recorded.
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Original contract quantities are currently active without variations.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Type</th>
                  <th className="p-3">Order / Ref</th>
                  <th className="p-3">Sanctioned By</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Previous Qty</th>
                  <th className="p-3 text-right">New Qty</th>
                  <th className="p-3 text-right">Previous Rate</th>
                  <th className="p-3 text-right">New Rate</th>
                  <th className="p-3 text-right">New Amount</th>
                  <th className="p-3">Justification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {revisions.map((rev) => (
                  <tr key={rev.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 uppercase">
                        {rev.revision_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-800">
                      {rev.revision_reference || '—'}
                    </td>
                    <td className="p-3 text-slate-600">
                      {rev.sanctioned_by || '—'}
                    </td>
                    <td className="p-3 text-slate-500">
                      {rev.sanction_date || new Date(rev.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-500">
                      {Number(rev.previous_quantity).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-blue-700">
                      {Number(rev.new_quantity).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-500">
                      ₹{Number(rev.previous_rate).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      ₹{Number(rev.new_rate).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      {formatINR(rev.new_amount)}
                    </td>
                    <td className="p-3 text-slate-600 max-w-xs truncate" title={rev.justification || ''}>
                      {rev.justification || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Revision Modal */}
      <AddBOQRevisionModal
        open={revisionModalOpen}
        onClose={() => setRevisionModalOpen(false)}
        item={item}
        projectId={project.id}
        contractId={contract?.id}
        onSaved={handleRevisionSaved}
      />

      {/* Edit Item Drawer */}
      <NewBOQItemDrawer
        open={editDrawerOpen}
        onClose={() => setEditDrawerOpen(false)}
        projectId={project.id}
        itemToEdit={item}
        onSaved={() => {
          router.refresh()
        }}
      />
    </div>
  )
}
