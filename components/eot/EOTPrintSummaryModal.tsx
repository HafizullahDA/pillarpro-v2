'use client'

import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { EOTCase } from '@/lib/types/eot'
import { ContractEvent, DetailedHindrance } from '@/lib/types/contractDefense'
import { EvidenceRecord } from '@/lib/types/evidence'
import { CorrespondenceRecord } from '@/lib/types/correspondence'
import { ContractRecord } from '@/lib/types/contract'
import { formatDate } from '@/lib/format'

interface EOTPrintSummaryModalProps {
  open: boolean
  onClose: () => void
  eotCase: EOTCase | null
  contract?: ContractRecord | null
  linkedEvents: ContractEvent[]
  linkedHindrances: DetailedHindrance[]
  linkedEvidence: EvidenceRecord[]
  linkedCorrespondence: CorrespondenceRecord[]
}

export function EOTPrintSummaryModal({
  open,
  onClose,
  eotCase,
  contract,
  linkedEvents,
  linkedHindrances,
  linkedEvidence,
  linkedCorrespondence,
}: EOTPrintSummaryModalProps) {
  if (!eotCase) return null

  const handlePrint = () => {
    window.print()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Printable EOT Dossier: ${eotCase.eot_reference}`}
    >
      <div className="space-y-6 text-xs max-h-[75vh] overflow-y-auto pr-1 print:max-h-none print:overflow-visible">
        {/* Print Controls Header */}
        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 print:hidden">
          <div className="text-slate-600 text-[11px]">
            <b>CPWD / Works Manual Form 27 Compatible:</b> Includes delay chronology, linked evidence proofs, and dispatch receipts.
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs">
              🖨️ Print / Save PDF
            </Button>
            <Button size="sm" variant="secondary" onClick={onClose} className="text-xs">
              Close
            </Button>
          </div>
        </div>

        {/* Printable Paper Document Container */}
        <div className="p-6 sm:p-8 bg-white border border-slate-300 rounded-xl space-y-6 text-slate-900 font-sans print:border-none print:p-0">
          {/* Formal Letterhead */}
          <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Government Construction Contract Administration (CPWD Works Manual Clause 5 / GCC)
            </p>
            <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight">
              APPLICATION &amp; CASE DOSSIER FOR EXTENSION OF TIME (EOT)
            </h1>
            <p className="text-xs font-semibold text-slate-700 font-mono">
              Dossier Reference: {eotCase.eot_reference} &bull; Case Status: {eotCase.status.replace(/_/g, ' ')}
            </p>
          </div>

          {/* Contract Particulars Table */}
          <div className="grid grid-cols-2 gap-4 text-xs border border-slate-200 p-3.5 rounded-lg bg-slate-50/50 font-mono">
            <div>
              <span className="text-slate-500 font-sans block text-[10px]">1. Name of Work / Project:</span>
              <span className="font-bold text-slate-900 font-sans">{eotCase.projects?.name || 'Project Name'}</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans block text-[10px]">2. Employer / Department:</span>
              <span className="font-bold text-slate-900 font-sans">{contract?.employer_name || eotCase.projects?.agency_name || 'Government Employer'}</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans block text-[10px]">3. Agreement Number:</span>
              <span className="font-bold text-slate-900">{contract?.agreement_number || 'Agreement on file'}</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans block text-[10px]">4. Work Order / NIT Ref:</span>
              <span className="font-bold text-slate-900">{contract?.work_order_number || contract?.nit_number || '—'}</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans block text-[10px]">5. Stipulated Date of Completion:</span>
              <span className="font-bold text-slate-900">{formatDate(eotCase.current_completion_date)}</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans block text-[10px]">6. Revised Date (Approved / Claimed):</span>
              <span className="font-bold text-blue-900">{formatDate(eotCase.revised_completion_date)}</span>
            </div>
          </div>

          {/* Summary of Claimed & Approved Days */}
          <div className="border border-slate-900 rounded-lg overflow-hidden">
            <div className="bg-slate-900 text-white px-3 py-1.5 font-bold text-xs uppercase tracking-wider">
              Summary of Time Extension Determination
            </div>
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 border-b border-slate-300 font-semibold text-slate-700">
                <tr>
                  <th className="p-2.5">Days Claimed by Contractor</th>
                  <th className="p-2.5">Days Approved by Employer</th>
                  <th className="p-2.5">Pending Decision</th>
                  <th className="p-2.5">Governing Clause</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                <tr>
                  <td className="p-2.5 font-bold text-sm text-slate-900">{eotCase.claimed_days} Calendar Days</td>
                  <td className="p-2.5 font-bold text-sm text-emerald-800">{eotCase.approved_days} Calendar Days</td>
                  <td className="p-2.5 font-bold text-sm text-amber-800">{eotCase.pending_days} Calendar Days</td>
                  <td className="p-2.5 font-sans font-medium text-slate-700">Clause 5 / Standard GCC</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Factual Cause */}
          <div className="space-y-1.5">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
              Factual Summary of Delay Cause (Neutral Record)
            </h3>
            <p className="text-xs text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
              {eotCase.cause}
            </p>
          </div>

          {/* Chronological Event & Hindrance Matrix */}
          <div className="space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
              Contemporaneous Chronology of Impediments (Potential EOT Events)
            </h3>
            {linkedEvents.length > 0 || linkedHindrances.length > 0 ? (
              <table className="w-full text-xs text-left border border-slate-200">
                <thead className="bg-slate-100 font-semibold text-slate-700">
                  <tr>
                    <th className="p-2 border-r border-slate-200">Ref No.</th>
                    <th className="p-2 border-r border-slate-200">Nature of Impediment</th>
                    <th className="p-2 border-r border-slate-200">Start Date</th>
                    <th className="p-2 border-r border-slate-200">End Date</th>
                    <th className="p-2 text-right">Delay (Days)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  {linkedEvents.map(ev => (
                    <tr key={ev.id}>
                      <td className="p-2 border-r border-slate-200 font-bold">{ev.event_number}</td>
                      <td className="p-2 border-r border-slate-200 font-sans">{ev.description}</td>
                      <td className="p-2 border-r border-slate-200">{formatDate(ev.start_date)}</td>
                      <td className="p-2 border-r border-slate-200">{ev.end_date ? formatDate(ev.end_date) : 'Ongoing'}</td>
                      <td className="p-2 text-right font-bold">{ev.actual_delay_days || ev.estimated_delay_days || 0}d</td>
                    </tr>
                  ))}
                  {linkedHindrances.map(h => (
                    <tr key={h.id}>
                      <td className="p-2 border-r border-slate-200 font-bold">{h.hindrance_number || 'Appx 21'}</td>
                      <td className="p-2 border-r border-slate-200 font-sans">{h.description}</td>
                      <td className="p-2 border-r border-slate-200">{formatDate(h.start_date)}</td>
                      <td className="p-2 border-r border-slate-200">{h.end_date ? formatDate(h.end_date) : 'Ongoing'}</td>
                      <td className="p-2 text-right font-bold">{h.net_delay_days || h.duration_days || 0}d</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-slate-400 italic text-[11px]">No separate event records linked.</p>
            )}
          </div>

          {/* Supporting Evidence Proofs */}
          <div className="space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
              Supporting Contemporaneous Evidence (Evidence Vault References)
            </h3>
            {linkedEvidence.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                {linkedEvidence.map(ev => (
                  <div key={ev.id} className="p-2 bg-slate-50 border border-slate-200 rounded">
                    <span className="font-bold text-slate-900 block font-sans">{ev.title}</span>
                    <span className="text-slate-500">
                      Doc No: {ev.evidence_number} &bull; Date: {formatDate(ev.document_date)} &bull; {ev.type}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 italic text-[11px]">No physical evidence attachments linked.</p>
            )}
          </div>

          {/* Statutory Notices Served */}
          <div className="space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
              Statutory Notices &amp; Official Letters Dispatched
            </h3>
            {linkedCorrespondence.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                {linkedCorrespondence.map(c => (
                  <div key={c.id} className="p-2 bg-slate-50 border border-slate-200 rounded">
                    <span className="font-bold text-slate-900 block font-sans">Letter No: {c.letter_number}</span>
                    <span className="text-slate-500 font-sans">Subject: {c.subject}</span>
                    <span className="text-slate-400 block">Dispatched: {formatDate(c.date)} ({c.mode_of_dispatch || 'Speed Post'})</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 italic text-[11px]">No separate notice records linked.</p>
            )}
          </div>

          {/* Sanction Details (if available) */}
          {eotCase.sanction_order_number && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs space-y-1">
              <span className="font-bold text-emerald-950 uppercase tracking-wider text-[11px] block">
                Sanction / Granting Order Particulars
              </span>
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div>Order Number: <b>{eotCase.sanction_order_number}</b></div>
                <div>Authority: <b>{eotCase.sanction_authority || 'Superintending Engineer'}</b></div>
                <div>Sanction Date: <b>{formatDate(eotCase.department_response_date)}</b></div>
                <div>Days Granted: <b className="text-emerald-800">{eotCase.approved_days} Days</b></div>
              </div>
            </div>
          )}

          {/* Signature Block */}
          <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs font-semibold text-slate-800 border-t border-slate-200">
            <div className="space-y-12">
              <div className="border-b border-slate-400 pb-1 w-48 mx-auto" />
              <p>Signature of Authorized Signatory<br /><span className="text-[11px] font-normal text-slate-500">For and on behalf of Contractor</span></p>
            </div>
            <div className="space-y-12">
              <div className="border-b border-slate-400 pb-1 w-48 mx-auto" />
              <p>Executive Engineer / Competent Authority<br /><span className="text-[11px] font-normal text-slate-500">Department / Division Office</span></p>
            </div>
          </div>

          {/* Legal Non-Advisory Notice */}
          <div className="text-center text-[10px] text-slate-400 pt-4 border-t border-slate-100">
            Factual Delay Compilation &bull; Generated via PillarPro Construction ERP &bull; Compiles contemporaneous site records without prejudice.
          </div>
        </div>
      </div>
    </Modal>
  )
}
