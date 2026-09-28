'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FieldWrapper } from '@/components/ui/FormField'
import { useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import { EOTCase, EOTStatus } from '@/lib/types/eot'
import { ContractRecord } from '@/lib/types/contract'
import { ContractEvent, DetailedHindrance } from '@/lib/types/contractDefense'
import { EvidenceRecord } from '@/lib/types/evidence'
import { CorrespondenceRecord } from '@/lib/types/correspondence'
import { calculateRevisedCompletionDate } from '@/lib/calculations/eot'
import { formatDate } from '@/lib/format'

interface NewEOTCaseModalProps {
  open: boolean
  onClose: () => void
  projects: Array<{ id: string; name: string; agency_name?: string | null; end_date?: string | null }>
  contracts: ContractRecord[]
  contractEvents: ContractEvent[]
  hindrances: DetailedHindrance[]
  evidenceList: EvidenceRecord[]
  correspondenceList: CorrespondenceRecord[]
  defaultProjectId?: string
  onSuccess: (newCase: EOTCase) => void
}

export function NewEOTCaseModal({
  open,
  onClose,
  projects,
  contracts,
  contractEvents,
  hindrances,
  evidenceList,
  correspondenceList,
  defaultProjectId,
  onSuccess,
}: NewEOTCaseModalProps) {
  const supabase = createClient()
  const { success, error: toastError } = useToast()

  const [projectId, setProjectId] = useState<string>(defaultProjectId || projects[0]?.id || '')
  const [contractId, setContractId] = useState<string>('')
  const [eotReference, setEotReference] = useState('EOT/2026/01')
  const [cause, setCause] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState('')
  const [claimedDays, setClaimedDays] = useState<number>(30)
  const [currentCompletionDate, setCurrentCompletionDate] = useState('')
  const [status, setStatus] = useState<EOTStatus>('DRAFT')
  const [remarks, setRemarks] = useState('')

  // Multi-selection of existing business records (No duplication)
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([])
  const [selectedHindranceIds, setSelectedHindranceIds] = useState<string[]>([])
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([])
  const [selectedCorrespondenceIds, setSelectedCorrespondenceIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Filter datasets by target project
  const projectContracts = contracts.filter(c => c.project_id === projectId)
  const projectEvents = contractEvents.filter(e => e.project_id === projectId)
  const projectHindrances = hindrances.filter(h => h.project_id === projectId)
  const projectEvidence = evidenceList.filter(e => e.project_id === projectId)
  const projectCorrespondence = correspondenceList.filter(c => c.project_id === projectId)

  useEffect(() => {
    if (projectId) {
      const matchedContract = contracts.find(c => c.project_id === projectId)
      if (matchedContract) {
        setContractId(matchedContract.id)
        setCurrentCompletionDate(matchedContract.current_completion_date || matchedContract.original_completion_date || '')
        setEotReference(`EOT/${matchedContract.agreement_number ? matchedContract.agreement_number.slice(0, 8) : 'CASE'}/01`)
      } else {
        const p = projects.find(item => item.id === projectId)
        setCurrentCompletionDate(p?.end_date || '')
        setEotReference(`EOT/${p?.name.slice(0, 4).toUpperCase() || 'CASE'}/01`)
      }
    }
  }, [projectId, contracts, projects])

  // Auto-sum claimed days when events/hindrances are checked
  const handleToggleEvent = (evId: string) => {
    setSelectedEventIds(prev => {
      const exists = prev.includes(evId)
      const next = exists ? prev.filter(id => id !== evId) : [...prev, evId]
      recalculateClaimedDays(next, selectedHindranceIds)
      return next
    })
  }

  const handleToggleHindrance = (hId: string) => {
    setSelectedHindranceIds(prev => {
      const exists = prev.includes(hId)
      const next = exists ? prev.filter(id => id !== hId) : [...prev, hId]
      recalculateClaimedDays(selectedEventIds, next)
      return next
    })
  }

  const recalculateClaimedDays = (eventIds: string[], hindranceIds: string[]) => {
    let total = 0
    for (const id of eventIds) {
      const ev = contractEvents.find(e => e.id === id)
      if (ev) total += (ev.actual_delay_days || ev.estimated_delay_days || 0)
    }
    for (const id of hindranceIds) {
      const h = hindrances.find(item => item.id === id)
      if (h) total += (h.net_delay_days || h.duration_days || 0)
    }
    if (total > 0) setClaimedDays(total)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectId || !eotReference.trim() || !cause.trim() || !currentCompletionDate) {
      toastError('Please fill in Project, EOT Reference, Cause, and Current Completion Date.')
      return
    }

    setSubmitting(true)
    try {
      const revisedDate = calculateRevisedCompletionDate(currentCompletionDate, 0)

      const payload = {
        project_id: projectId,
        contract_id: contractId || null,
        eot_reference: eotReference.trim(),
        cause: cause.trim(),
        start_date: startDate,
        end_date: endDate || null,
        claimed_days: claimedDays,
        approved_days: 0,
        pending_days: claimedDays,
        submission_date: new Date().toISOString().slice(0, 10),
        current_completion_date: currentCompletionDate,
        revised_completion_date: revisedDate,
        status,
        remarks: remarks.trim() || null,
        event_ids: selectedEventIds,
        hindrance_ids: selectedHindranceIds,
        evidence_ids: selectedEvidenceIds,
        correspondence_ids: selectedCorrespondenceIds,
      }

      const { data, error } = await supabase
        .from('contract_eot_cases')
        .insert(payload)
        .select('*, projects(id, name, agency_name), contracts(id, agreement_number, contract_title)')
        .single()

      if (error) throw error

      success('Extension of Time case created successfully.')
      onSuccess(data as EOTCase)
      onClose()
    } catch (err: any) {
      console.error('Error creating EOT case:', err)
      toastError(err.message || 'Failed to create EOT case.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Draft Extension of Time (EOT) Application">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
        {/* Non-Entitlement Factual Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-blue-950 flex items-start gap-2.5">
          <span className="text-base leading-none">ℹ️</span>
          <div className="text-[11px] leading-relaxed">
            <b>Factual Delay Compilation:</b> Select potential EOT events and hindrances on record. Linking an event does not automatically establish entitlement; approval is subject to the Employer&apos;s formal review under contract terms.
          </div>
        </div>

        {/* Project & Contract Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldWrapper label="Target Project" required>
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </FieldWrapper>

          <FieldWrapper label="Associated Contract Agreement">
            <select
              value={contractId}
              onChange={e => setContractId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              <option value="">Project Level (No specific agreement)</option>
              {projectContracts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.agreement_number ? `Agr: ${c.agreement_number}` : c.contract_title || c.id}
                </option>
              ))}
            </select>
          </FieldWrapper>
        </div>

        {/* EOT Reference & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FieldWrapper label="EOT Reference No." required>
            <input
              type="text"
              required
              value={eotReference}
              onChange={e => setEotReference(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </FieldWrapper>

          <FieldWrapper label="Current Completion Date" required>
            <input
              type="date"
              required
              value={currentCompletionDate}
              onChange={e => setCurrentCompletionDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </FieldWrapper>

          <FieldWrapper label="Initial Case Status" required>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as EOTStatus)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              <option value="DRAFT">Draft Case</option>
              <option value="PREPARING">Preparing Dossier</option>
              <option value="SUBMITTED">Submitted to Dept</option>
              <option value="UNDER_REVIEW">Under Review</option>
            </select>
          </FieldWrapper>
        </div>

        {/* Factual Cause */}
        <FieldWrapper label="Factual Summary of Cause (Neutral Statement)" required>
          <textarea
            required
            rows={3}
            value={cause}
            onChange={e => setCause(e.target.value)}
            placeholder="e.g. Non-handover of land parcel at Km 4+200, awaiting department utility pole shifting and statutory environmental clearance..."
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
          />
        </FieldWrapper>

        {/* Date Period & Days Claimed */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <FieldWrapper label="Earliest Impediment Date" required>
            <input
              type="date"
              required
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900"
            />
          </FieldWrapper>

          <FieldWrapper label="Latest Removal Date">
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              placeholder="Leave blank if ongoing"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900"
            />
          </FieldWrapper>

          <FieldWrapper label="Total Days Claimed" required>
            <input
              type="number"
              min="1"
              required
              value={claimedDays}
              onChange={e => setClaimedDays(parseInt(e.target.value, 10) || 0)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-blue-900 text-sm"
            />
          </FieldWrapper>
        </div>

        {/* Link Potential EOT Events */}
        <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
            Link Potential EOT Events ({selectedEventIds.length} selected)
          </span>
          <p className="text-[11px] text-slate-500 mb-2">
            Select existing contemporaneous contract events (does not duplicate records):
          </p>
          {projectEvents.length > 0 ? (
            <div className="max-h-36 overflow-y-auto space-y-1.5 divide-y divide-slate-100 pr-1">
              {projectEvents.map(ev => (
                <label key={ev.id} className="flex items-center justify-between pt-1 text-xs cursor-pointer hover:bg-white p-1.5 rounded transition-colors">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedEventIds.includes(ev.id)}
                      onChange={() => handleToggleEvent(ev.id)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-bold text-slate-900 font-mono">{ev.event_number}: </span>
                      <span className="text-slate-700">{ev.description.slice(0, 50)}...</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 shrink-0">
                    {ev.actual_delay_days || ev.estimated_delay_days || 0}d
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 italic text-[11px]">No contract events logged for this project yet.</p>
          )}
        </div>

        {/* Link Hindrance Register Records */}
        <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
            Link Hindrance Register Records ({selectedHindranceIds.length} selected)
          </span>
          {projectHindrances.length > 0 ? (
            <div className="max-h-36 overflow-y-auto space-y-1.5 divide-y divide-slate-100 pr-1">
              {projectHindrances.map(h => (
                <label key={h.id} className="flex items-center justify-between pt-1 text-xs cursor-pointer hover:bg-white p-1.5 rounded transition-colors">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedHindranceIds.includes(h.id)}
                      onChange={() => handleToggleHindrance(h.id)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-bold text-slate-900 font-mono">{h.hindrance_number || 'Appx 21'}: </span>
                      <span className="text-slate-700">{h.description.slice(0, 50)}...</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 shrink-0">
                    Net: {h.net_delay_days || h.duration_days || 0}d
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 italic text-[11px]">No hindrances logged for this project yet.</p>
          )}
        </div>

        {/* Link Evidence Proofs */}
        {projectEvidence.length > 0 && (
          <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
              Attach Evidence Proofs ({selectedEvidenceIds.length} selected)
            </span>
            <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
              {projectEvidence.map(ev => (
                <label key={ev.id} className="flex items-center gap-2 text-xs cursor-pointer p-1 hover:bg-white rounded">
                  <input
                    type="checkbox"
                    checked={selectedEvidenceIds.includes(ev.id)}
                    onChange={() => {
                      setSelectedEvidenceIds(prev =>
                        prev.includes(ev.id) ? prev.filter(id => id !== ev.id) : [...prev, ev.id]
                      )
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium text-slate-800 truncate">{ev.title} ({ev.evidence_number})</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Link Official Letters & Notices */}
        {projectCorrespondence.length > 0 && (
          <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
              Attach Official Letters &amp; Notices ({selectedCorrespondenceIds.length} selected)
            </span>
            <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
              {projectCorrespondence.map(c => (
                <label key={c.id} className="flex items-center gap-2 text-xs cursor-pointer p-1 hover:bg-white rounded">
                  <input
                    type="checkbox"
                    checked={selectedCorrespondenceIds.includes(c.id)}
                    onChange={() => {
                      setSelectedCorrespondenceIds(prev =>
                        prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]
                      )
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium text-slate-800 truncate">
                    {c.letter_number} &bull; {c.subject} ({formatDate(c.date)})
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
            {submitting ? 'Creating Case...' : 'Create EOT Application'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
