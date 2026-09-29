'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { formatINR, formatDate } from '@/lib/format'
import { ContractClaim, ClaimStatus } from '@/lib/types/claims'
import { ClaimStatusBadge } from './ClaimStatusBadge'
import { ClaimTypeBadge } from './ClaimTypeBadge'
import { RelatedRecordsPanel, RelatedRecordItem } from '@/components/common/RelatedRecordsPanel'

interface Props {
  claim: ContractClaim | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (updated: ContractClaim) => void
  onPrint: (claim: ContractClaim) => void
}

export function ClaimDetailModal({
  claim,
  isOpen,
  onClose,
  onUpdate,
  onPrint,
}: Props) {
  const toast = useToast()
  const supabase = createClient()

  const [saving, setSaving] = useState(false)
  const [showAwardForm, setShowAwardForm] = useState(false)

  // Award / Determination inputs
  const [status, setStatus] = useState<ClaimStatus>(claim?.status || 'APPROVED')
  const [adjudicationAuthority, setAdjudicationAuthority] = useState(
    claim?.adjudication_authority || 'Superintending Engineer, CPWD'
  )
  const [orderReferenceNumber, setOrderReferenceNumber] = useState(
    claim?.order_reference_number || `AWD-${new Date().getFullYear()}-01`
  )
  const [adjudicationDate, setAdjudicationDate] = useState(
    claim?.adjudication_date || new Date().toISOString().split('T')[0]
  )
  const [approvedAmount, setApprovedAmount] = useState<number>(
    claim?.approved_amount || 0
  )
  const [paidAmount, setPaidAmount] = useState<number>(claim?.paid_amount || 0)

  if (!isOpen || !claim) return null

  const handleSaveAward = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      let outstanding = 0
      if (status === 'APPROVED' || status === 'PARTIALLY_APPROVED') {
        outstanding = Math.max(0, approvedAmount - paidAmount)
      } else if (status === 'REJECTED' || status === 'CLOSED') {
        outstanding = 0
      } else {
        outstanding = Math.max(0, claim.claimed_amount - paidAmount)
      }

      const payload = {
        status,
        adjudication_authority: adjudicationAuthority.trim(),
        order_reference_number: orderReferenceNumber.trim(),
        adjudication_date: adjudicationDate,
        approved_amount: approvedAmount,
        paid_amount: paidAmount,
        outstanding_amount: outstanding,
      }

      const { data, error } = await supabase
        .from('contract_claims')
        .update(payload)
        .eq('id', claim.id)
        .select(
          '*, projects(id, name, agency_name, awarded_amount), contracts(id, agreement_number, contract_title)'
        )
        .single()

      if (error) throw error

      toast.success('Determination and award details updated.')
      onUpdate(data)
      setShowAwardForm(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update determination.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <ClaimTypeBadge type={claim.claim_type} />
            <div>
              <h2 className="text-base font-bold text-slate-900 font-mono">
                {claim.claim_number}
              </h2>
              <p className="text-xs text-slate-500">
                {claim.projects?.name || 'Contractual Claim'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ClaimStatusBadge status={claim.status} />
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1 rounded-lg"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
          {/* Title & Date */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="font-bold text-slate-900 text-sm block mb-1">
              {claim.title}
            </span>
            <div className="flex items-center gap-3 text-slate-500 text-[11px]">
              <span>Date: {formatDate(claim.claim_date)}</span>
              {claim.basis_of_claim && (
                <>
                  <span>&bull;</span>
                  <span className="font-semibold text-slate-700">Basis: {claim.basis_of_claim}</span>
                </>
              )}
            </div>
          </div>

          {/* 4-way Financial Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-center">
            <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl">
              <span className="text-[10px] text-purple-700 block font-sans font-bold">1. CLAIMED</span>
              <span className="font-bold text-purple-950 text-sm">{formatINR(claim.claimed_amount)}</span>
            </div>
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-[10px] text-emerald-700 block font-sans font-bold">2. APPROVED</span>
              <span className="font-bold text-emerald-950 text-sm">{formatINR(claim.approved_amount)}</span>
            </div>
            <div className="p-2.5 bg-teal-50 border border-teal-200 rounded-xl">
              <span className="text-[10px] text-teal-700 block font-sans font-bold">3. PAID</span>
              <span className="font-bold text-teal-950 text-sm">{formatINR(claim.paid_amount)}</span>
            </div>
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-[10px] text-amber-700 block font-sans font-bold">4. OUTSTANDING</span>
              <span className="font-bold text-amber-950 text-sm">{formatINR(claim.outstanding_amount)}</span>
            </div>
          </div>

          {/* Factual Narrative */}
          <div>
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block mb-1">
              Factual Narrative &amp; Damage Quantification
            </span>
            <p className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 whitespace-pre-line leading-relaxed">
              {claim.description}
            </p>
          </div>

          {/* Linked Record Badges */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
              Contemporaneous Substantiation Links
            </span>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="px-2 py-1 bg-white border border-slate-200 rounded font-semibold text-slate-700">
                {claim.event_ids?.length || 0} Contract Events
              </span>
              <span className="px-2 py-1 bg-white border border-slate-200 rounded font-semibold text-slate-700">
                {claim.hindrance_ids?.length || 0} Hindrances
              </span>
              <span className="px-2 py-1 bg-white border border-slate-200 rounded font-semibold text-slate-700">
                {claim.evidence_ids?.length || 0} Evidence Vault Proofs
              </span>
              <span className="px-2 py-1 bg-white border border-slate-200 rounded font-semibold text-slate-700">
                {claim.correspondence_ids?.length || 0} Notices / Letters
              </span>
            </div>
          </div>


          {/* UNIFIED RELATED RECORDS PANEL */}
          <RelatedRecordsPanel
            title="Traceable Related Records (Claim Substantiation)"
            records={[
              {
                id: claim.project_id,
                type: 'project' as const,
                title: claim.projects?.name || 'Project Master Record',
                href: `/projects/${claim.project_id}`,
              },
              ...(claim.contract_id ? [{
                id: claim.contract_id,
                type: 'contract' as const,
                title: claim.contracts?.agreement_number ? `Agreement: ${claim.contracts.agreement_number}` : 'Contract Master',
                subtitle: claim.contracts?.contract_title || undefined,
                referenceNumber: claim.contracts?.agreement_number || undefined,
                href: `/projects/${claim.project_id}/contract`,
              }] : []),
              {
                id: `evts-${claim.id}`,
                type: 'event' as const,
                title: 'Linked Contract Events',
                subtitle: `${claim.event_ids?.length || 0} contemporaneous delay events`,
                href: `/hindrances?tab=events&projectId=${claim.project_id}`,
              },
              {
                id: `hind-${claim.id}`,
                type: 'hindrance' as const,
                title: 'Linked Hindrances (Appx 21)',
                subtitle: `${claim.hindrance_ids?.length || 0} hindrance register entries`,
                href: `/hindrances?tab=hindrances&projectId=${claim.project_id}`,
              },
              {
                id: `notices-${claim.id}`,
                type: 'notice' as const,
                title: 'Statutory Notices & Letters',
                subtitle: `${claim.correspondence_ids?.length || 0} contractual notices dispatched`,
                href: `/correspondence?projectId=${claim.project_id}`,
              },
              {
                id: `eot-${claim.id}`,
                type: 'eot' as const,
                title: 'Extension of Time Cases (Form 27)',
                subtitle: `${claim.eot_case_ids?.length || 0} linked EOT submissions`,
                href: `/eot?projectId=${claim.project_id}`,
              },
              {
                id: `evidence-${claim.id}`,
                type: 'evidence' as const,
                title: 'Evidence Vault Proofs',
                subtitle: `${claim.evidence_ids?.length || 0} physical proofs & documents`,
                href: `/evidence?projectId=${claim.project_id}`,
              },
              {
                id: `ledger-${claim.id}`,
                type: 'payment' as const,
                title: 'Financial Realization & Ledger',
                subtitle: `Approved: ₹${claim.approved_amount} • Paid: ₹${claim.paid_amount}`,
                href: `/ledgers?projectId=${claim.project_id}`,
              },
            ]}
          />

          {/* Award / Adjudication Record Form */}
          {showAwardForm ? (
            <form onSubmit={handleSaveAward} className="p-4 bg-emerald-50/60 border border-emerald-300 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                <span className="font-bold text-emerald-950 text-xs uppercase tracking-wider">
                  Record Department Sanction / Arbitral Award
                </span>
                <button
                  type="button"
                  onClick={() => setShowAwardForm(false)}
                  className="text-emerald-700 font-bold"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-emerald-900 uppercase mb-1">
                    Adjudication Status
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as ClaimStatus)}
                    className="w-full px-2.5 py-1.5 border border-emerald-300 rounded-lg text-xs bg-white text-slate-900 font-bold"
                  >
                    <option value="UNDER_REVIEW">UNDER_REVIEW (In Adjudication)</option>
                    <option value="PARTIALLY_APPROVED">PARTIALLY_APPROVED</option>
                    <option value="APPROVED">APPROVED / AWARDED</option>
                    <option value="REJECTED">REJECTED (Disallowed)</option>
                    <option value="PAID">PAID (Disbursed)</option>
                    <option value="CLOSED">CLOSED (Concluded)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-emerald-900 uppercase mb-1">
                    Adjudication Authority
                  </label>
                  <input
                    type="text"
                    value={adjudicationAuthority}
                    onChange={e => setAdjudicationAuthority(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-emerald-300 rounded-lg text-xs bg-white text-slate-900"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-emerald-900 uppercase mb-1">
                    Order / Award Ref Number
                  </label>
                  <input
                    type="text"
                    value={orderReferenceNumber}
                    onChange={e => setOrderReferenceNumber(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-emerald-300 rounded-lg text-xs font-mono font-bold bg-white text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-emerald-900 uppercase mb-1">
                    Award Date
                  </label>
                  <input
                    type="date"
                    value={adjudicationDate}
                    onChange={e => setAdjudicationDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-emerald-300 rounded-lg text-xs bg-white text-slate-900"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-emerald-900 uppercase mb-1">
                    Approved Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={approvedAmount}
                    onChange={e => setApprovedAmount(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-emerald-300 rounded-lg text-xs font-mono font-bold bg-white text-emerald-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-emerald-900 uppercase mb-1">
                    Paid / Disbursed Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={paidAmount}
                    onChange={e => setPaidAmount(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-emerald-300 rounded-lg text-xs font-mono font-bold bg-white text-teal-900"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowAwardForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Award Record'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <span className="font-bold text-slate-800 text-xs block">
                  Official Adjudication &amp; Award
                </span>
                <span className="text-[11px] text-slate-500">
                  Record Department Sanction, DRB recommendation, or Arbitral Award
                </span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowAwardForm(true)}
              >
                Record Adjudication / Award
              </Button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPrint(claim)}
            className="flex items-center gap-1.5"
          >
            <span>🖨️</span>
            <span>Print Statement of Claim (Memorial)</span>
          </Button>
          <Button variant="primary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
