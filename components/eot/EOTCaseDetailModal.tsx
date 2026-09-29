'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FieldWrapper } from '@/components/ui/FormField'
import { useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import { EOTCase, EOTStatus } from '@/lib/types/eot'
import { EOTStatusBadge } from './EOTStatusBadge'
import { RelatedRecordsPanel, RelatedRecordItem } from '@/components/common/RelatedRecordsPanel'
import { ContractRecord } from '@/lib/types/contract'
import { ContractEvent, DetailedHindrance } from '@/lib/types/contractDefense'
import { EvidenceRecord } from '@/lib/types/evidence'
import { CorrespondenceRecord } from '@/lib/types/correspondence'
import { calculateRevisedCompletionDate } from '@/lib/calculations/eot'
import { formatDate } from '@/lib/format'

interface EOTCaseDetailModalProps {
  open: boolean
  onClose: () => void
  eotCase: EOTCase | null
  contracts: ContractRecord[]
  contractEvents: ContractEvent[]
  hindrances: DetailedHindrance[]
  evidenceList: EvidenceRecord[]
  correspondenceList: CorrespondenceRecord[]
  onUpdate: (updatedCase: EOTCase) => void
  onPrint: (caseToPrint: EOTCase) => void
}

export function EOTCaseDetailModal({
  open,
  onClose,
  eotCase,
  contracts,
  contractEvents,
  hindrances,
  evidenceList,
  correspondenceList,
  onUpdate,
  onPrint,
}: EOTCaseDetailModalProps) {
  const supabase = createClient()
  const { success, error: toastError } = useToast()

  const [sanctionOpen, setSanctionOpen] = useState(false)
  const [approvedDays, setApprovedDays] = useState<number>(eotCase?.approved_days || 0)
  const [responseDate, setResponseDate] = useState<string>(eotCase?.department_response_date || new Date().toISOString().slice(0, 10))
  const [sanctionAuth, setSanctionAuth] = useState<string>(eotCase?.sanction_authority || 'Superintending Engineer')
  const [sanctionOrderNo, setSanctionOrderNo] = useState<string>(eotCase?.sanction_order_number || '')
  const [decisionStatus, setDecisionStatus] = useState<EOTStatus>(eotCase?.status || 'APPROVED')
  const [decisionRemarks, setDecisionRemarks] = useState<string>(eotCase?.remarks || '')
  const [savingDecision, setSavingDecision] = useState(false)

  if (!eotCase) return null

  const matchedContract = contracts.find(c => c.id === eotCase.contract_id)
  const linkedEvents = contractEvents.filter(e => eotCase.event_ids?.includes(e.id))
  const linkedHindrances = hindrances.filter(h => eotCase.hindrance_ids?.includes(h.id))
  const linkedEvidence = evidenceList.filter(ev => eotCase.evidence_ids?.includes(ev.id))
  const linkedCorrespondence = correspondenceList.filter(c => eotCase.correspondence_ids?.includes(c.id))

  const handleSaveDecision = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingDecision(true)
    try {
      const revisedDate = calculateRevisedCompletionDate(eotCase.current_completion_date, approvedDays)
      const pending = decisionStatus === 'REJECTED' || decisionStatus === 'CLOSED'
        ? 0
        : Math.max(0, eotCase.claimed_days - approvedDays)

      const payload = {
        approved_days: approvedDays,
        pending_days: pending,
        department_response_date: responseDate || null,
        sanction_authority: sanctionAuth.trim() || null,
        sanction_order_number: sanctionOrderNo.trim() || null,
        status: decisionStatus,
        revised_completion_date: revisedDate,
        remarks: decisionRemarks.trim() || null,
      }

      const { data, error } = await supabase
        .from('contract_eot_cases')
        .update(payload)
        .eq('id', eotCase.id)
        .select('*, projects(id, name, agency_name), contracts(id, agreement_number, contract_title)')
        .single()

      if (error) throw error

      success('Department decision recorded and revised completion date updated.')
      onUpdate(data as EOTCase)
      setSanctionOpen(false)
    } catch (err: any) {
      console.error('Error saving department decision:', err)
      toastError(err.message || 'Failed to update department decision.')
    } finally {
      setSavingDecision(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Extension of Time Case: ${eotCase.eot_reference}`}
    >
      <div className="space-y-4 text-xs text-slate-700 max-h-[75vh] overflow-y-auto pr-1">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
          <div>
            <span className="font-bold text-base text-slate-900 font-mono">
              {eotCase.eot_reference}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {eotCase.projects?.name} &bull; Submitted on {formatDate(eotCase.submission_date)}
            </p>
          </div>
          <div>
            <EOTStatusBadge status={eotCase.status} />
          </div>
        </div>

        {/* Mathematical Transparent Formula Card */}
        <div className="bg-slate-900 text-white rounded-xl p-4 font-mono space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>CONTRACTUAL COMPLETION CALCULATION</span>
            <span className="text-emerald-400 font-bold">+ {eotCase.approved_days} Days Approved</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">Original Completion</span>
              <span className="text-xs font-bold text-white">{formatDate(eotCase.current_completion_date)}</span>
            </div>
            <div className="flex items-center justify-center text-slate-400 font-bold text-sm">
              + {eotCase.approved_days}d =
            </div>
            <div>
              <span className="text-[10px] text-emerald-400 block font-sans font-bold">Revised Completion</span>
              <span className="text-xs font-black text-emerald-300">{formatDate(eotCase.revised_completion_date)}</span>
            </div>
          </div>
        </div>

        {/* Summary Metric Strip */}
        <div className="grid grid-cols-3 gap-3 text-center bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div>
            <span className="text-slate-500 block text-[11px]">Days Claimed</span>
            <span className="text-lg font-black text-slate-900 font-mono">{eotCase.claimed_days}d</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Days Approved</span>
            <span className="text-lg font-black text-emerald-700 font-mono">{eotCase.approved_days}d</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Pending Decision</span>
            <span className="text-lg font-black text-amber-700 font-mono">{eotCase.pending_days}d</span>
          </div>
        </div>

        {/* Factual Cause */}
        <div>
          <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block mb-1">
            Factual Cause of Delay
          </span>
          <p className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-slate-800 leading-relaxed text-xs">
            {eotCase.cause}
          </p>
        </div>

        {/* Potential EOT Events Linked */}
        <div className="space-y-1">
          <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
            Potential EOT Events Linked ({linkedEvents.length})
          </span>
          {linkedEvents.length > 0 ? (
            <div className="divide-y divide-slate-100 bg-slate-50 rounded-lg p-2 border border-slate-200">
              {linkedEvents.map(ev => (
                <div key={ev.id} className="py-1.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold font-mono text-slate-900">{ev.event_number}: </span>
                    <span className="text-slate-700">{ev.description}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-600">
                    {ev.actual_delay_days || ev.estimated_delay_days || 0}d
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 italic text-[11px]">No separate contract event records attached.</p>
          )}
        </div>

        {/* Linked Hindrances */}
        <div className="space-y-1">
          <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
            Linked Hindrance Register Entries ({linkedHindrances.length})
          </span>
          {linkedHindrances.length > 0 ? (
            <div className="divide-y divide-slate-100 bg-slate-50 rounded-lg p-2 border border-slate-200">
              {linkedHindrances.map(h => (
                <div key={h.id} className="py-1.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold font-mono text-slate-900">{h.hindrance_number || 'Appx 21'}: </span>
                    <span className="text-slate-700">{h.description}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-600">
                    Net: {h.net_delay_days || h.duration_days || 0}d
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 italic text-[11px]">No hindrance records attached.</p>
          )}
        </div>

        {/* Linked Supporting Proofs */}
        {linkedEvidence.length > 0 && (
          <div className="space-y-1">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
              Supporting Documentary Proofs ({linkedEvidence.length})
            </span>
            <div className="divide-y divide-slate-100 bg-slate-50 rounded-lg p-2 border border-slate-200">
              {linkedEvidence.map(ev => (
                <div key={ev.id} className="py-1.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-900">{ev.title}</span>
                    <span className="text-slate-400 font-mono ml-2">{ev.evidence_number} &bull; {ev.type}</span>
                  </div>
                  {ev.file_url && (
                    <a href={ev.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-semibold">
                      View &rarr;
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}


        {/* UNIFIED RELATED RECORDS PANEL */}
        <RelatedRecordsPanel
          title="Traceable Related Records (EOT Dossier Chain)"
          records={[
            {
              id: eotCase.project_id,
              type: 'project' as const,
              title: eotCase.projects?.name || 'Project Master',
              href: `/projects/${eotCase.project_id}`,
            },
            ...(eotCase.contract_id ? [{
              id: eotCase.contract_id,
              type: 'contract' as const,
              title: eotCase.contracts?.agreement_number ? `Agreement: ${eotCase.contracts.agreement_number}` : 'Contract Master',
              subtitle: eotCase.contracts?.contract_title || undefined,
              href: `/projects/${eotCase.project_id}/contract`,
            }] : []),
            {
              id: `evts-${eotCase.id}`,
              type: 'event' as const,
              title: 'Linked Potential EOT Events',
              subtitle: `${linkedEvents.length} events logged`,
              href: `/hindrances?tab=events&projectId=${eotCase.project_id}`,
            },
            {
              id: `hind-${eotCase.id}`,
              type: 'hindrance' as const,
              title: 'Hindrance Register (Appendix 21)',
              subtitle: `${linkedHindrances.length} hindrances recorded`,
              href: `/hindrances?tab=hindrances&projectId=${eotCase.project_id}`,
            },
            {
              id: `ev-${eotCase.id}`,
              type: 'evidence' as const,
              title: 'Evidence Vault Proof Documents',
              subtitle: `${linkedEvidence.length} physical documents`,
              href: `/evidence?projectId=${eotCase.project_id}`,
            },
            {
              id: `corr-${eotCase.id}`,
              type: 'notice' as const,
              title: 'Statutory Notices Dispatched',
              subtitle: `${linkedCorrespondence.length} notices on record`,
              href: `/correspondence?projectId=${eotCase.project_id}`,
            },
            {
              id: `claims-${eotCase.id}`,
              type: 'claim' as const,
              title: 'Contractual Delay Claims',
              subtitle: 'Prolongation & idle resource claims',
              href: `/claims?projectId=${eotCase.project_id}`,
            },
          ]}
        />

        {/* Record Department Sanction Section (Collapsible / Toggle) */}
        {sanctionOpen ? (
          <form onSubmit={handleSaveDecision} className="bg-amber-50/70 border border-amber-300 rounded-xl p-3.5 space-y-3">
            <span className="font-bold text-amber-950 uppercase tracking-wider text-xs block">
              Record Employer / Department Determination
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FieldWrapper label="Days Approved by Dept" required>
                <input
                  type="number"
                  min="0"
                  max={eotCase.claimed_days}
                  required
                  value={approvedDays}
                  onChange={e => setApprovedDays(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-emerald-800"
                />
              </FieldWrapper>

              <FieldWrapper label="Decision Date" required>
                <input
                  type="date"
                  required
                  value={responseDate}
                  onChange={e => setResponseDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono"
                />
              </FieldWrapper>

              <FieldWrapper label="New Case Status" required>
                <select
                  value={decisionStatus}
                  onChange={e => setDecisionStatus(e.target.value as EOTStatus)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
                >
                  <option value="APPROVED">Approved (Full)</option>
                  <option value="PARTIALLY_APPROVED">Partially Approved</option>
                  <option value="UNDER_REVIEW">Under Technical Review</option>
                  <option value="REJECTED">Rejected (Disallowed)</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </FieldWrapper>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldWrapper label="Sanction Order Number">
                <input
                  type="text"
                  value={sanctionOrderNo}
                  onChange={e => setSanctionOrderNo(e.target.value)}
                  placeholder="e.g. SE/PWD/TS/2026/891"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono"
                />
              </FieldWrapper>

              <FieldWrapper label="Sanctioning Authority">
                <input
                  type="text"
                  value={sanctionAuth}
                  onChange={e => setSanctionAuth(e.target.value)}
                  placeholder="e.g. Superintending Engineer, Circle-I"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                />
              </FieldWrapper>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="secondary" onClick={() => setSanctionOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" disabled={savingDecision} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                {savingDecision ? 'Saving...' : 'Update Decision & Recalculate'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <span className="font-bold text-slate-800 text-xs block">Employer Decision Status</span>
              <p className="text-slate-500 text-[11px]">
                {eotCase.approved_days > 0
                  ? `${eotCase.approved_days} days granted under ${eotCase.sanction_order_number || 'Official Order'}`
                  : 'Awaiting formal determination from Executive Engineer'}
              </p>
            </div>
            <Button size="sm" onClick={() => setSanctionOpen(true)} className="text-xs bg-slate-900 text-white hover:bg-slate-800">
              Record Dept Sanction &rarr;
            </Button>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <Button
            size="sm"
            onClick={() => {
              onClose()
              onPrint(eotCase)
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5"
          >
            <span>🖨️</span>
            <span>Print EOT Summary (PDF)</span>
          </Button>

          <Button size="sm" variant="secondary" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
