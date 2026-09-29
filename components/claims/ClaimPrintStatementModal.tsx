'use client'

import { formatINR, formatDate } from '@/lib/format'
import { ContractClaim, CLAIM_TYPE_CONFIG } from '@/lib/types/claims'
import { Button } from '@/components/ui/Button'

interface Props {
  claim: ContractClaim | null
  isOpen: boolean
  onClose: () => void
}

export function ClaimPrintStatementModal({ claim, isOpen, onClose }: Props) {
  if (!isOpen || !claim) return null

  const typeConfig = CLAIM_TYPE_CONFIG[claim.claim_type]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 print:hidden">
          <span className="font-bold text-slate-800 text-sm">
            Formal Statement of Claim / Dispute Memorial Preview
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => window.print()}
              className="bg-blue-600 text-white font-bold"
            >
              🖨️ Print / Save as PDF
            </Button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1 rounded-lg"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 space-y-6 text-slate-900 font-sans print:p-0 text-xs">
          {/* Header */}
          <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-600 block">
              In the Matter of Dispute Resolution / Arbitral Proceedings
            </span>
            <h1 className="text-lg font-black tracking-tight uppercase">
              Formal Statement of Claim &amp; Damage Quantification
            </h1>
            <p className="text-xs font-semibold text-slate-700">
              Submitted under Contract Provisions &amp; Arbitration Agreement ({typeConfig.clauseRef})
            </p>
          </div>

          {/* Contract Particulars */}
          <div className="grid grid-cols-2 gap-4 border border-slate-300 p-3 rounded text-[11px]">
            <div>
              <span className="text-slate-500 block">Project:</span>
              <span className="font-bold text-slate-900">{claim.projects?.name}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Agreement Number:</span>
              <span className="font-bold text-slate-900 font-mono">
                {claim.contracts?.agreement_number || 'Under Main Contract'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Claim Reference No:</span>
              <span className="font-bold text-slate-900 font-mono">{claim.claim_number}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Submission Date:</span>
              <span className="font-bold text-slate-900">{formatDate(claim.claim_date)}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Head of Claim:</span>
              <span className="font-bold text-slate-900">{typeConfig.label}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Contractual Basis:</span>
              <span className="font-semibold text-slate-900">{claim.basis_of_claim || 'GCC Provisions'}</span>
            </div>
          </div>

          {/* Financial Quantum */}
          <div className="p-4 bg-slate-50 border border-slate-300 rounded space-y-1">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-700 block">
              Particulars of Quantified Relief Claimed
            </span>
            <div className="flex items-center justify-between text-base font-bold font-mono">
              <span className="text-slate-800">Total Claimed Quantum:</span>
              <span className="text-purple-900">{formatINR(claim.claimed_amount)}</span>
            </div>
            {claim.approved_amount > 0 && (
              <div className="flex items-center justify-between text-xs font-mono text-emerald-800 pt-1 border-t border-slate-200">
                <span>Sanctioned / Awarded Amount:</span>
                <span className="font-bold">{formatINR(claim.approved_amount)}</span>
              </div>
            )}
          </div>

          {/* Factual Narrative & Basis */}
          <div className="space-y-2">
            <span className="font-bold text-xs uppercase tracking-wider block">
              Factual Contemporaneous Background &amp; Submissions
            </span>
            <p className="border border-slate-300 p-3 rounded text-slate-800 bg-slate-50/40 whitespace-pre-line leading-relaxed">
              {claim.description}
            </p>
          </div>

          {/* Schedule of Contemporaneous Evidentiary Links */}
          <div className="space-y-1">
            <span className="font-bold text-xs uppercase tracking-wider block">
              Schedule of Attached Contemporaneous Records
            </span>
            <div className="border border-slate-300 rounded p-3 text-[11px] grid grid-cols-2 gap-2 font-mono">
              <div>&bull; Linked Contract Events: {claim.event_ids?.length || 0} records</div>
              <div>&bull; Linked Hindrances (Appx 21): {claim.hindrance_ids?.length || 0} records</div>
              <div>&bull; Evidence Vault Proofs: {claim.evidence_ids?.length || 0} records</div>
              <div>&bull; Statutory Notices Dispatched: {claim.correspondence_ids?.length || 0} records</div>
            </div>
          </div>

          {/* Statutory Disclaimer */}
          <p className="text-[10px] text-slate-500 leading-relaxed italic border-t border-slate-200 pt-3">
            Note: This Statement of Claim is submitted without prejudice to all rights and remedies available to the Contractor under the Contract and the Arbitration and Conciliation Act, 1996.
          </p>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-12 pt-8 text-center text-xs">
            <div className="border-t border-slate-900 pt-2 space-y-1">
              <span className="font-bold block">Contractor&apos;s Authorized Representative</span>
              <span className="text-[10px] text-slate-500 block">Submitted By</span>
            </div>
            <div className="border-t border-slate-900 pt-2 space-y-1">
              <span className="font-bold block">Competent Authority / Arbitral Tribunal</span>
              <span className="text-[10px] text-slate-500 block">Acknowledged For Review</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
