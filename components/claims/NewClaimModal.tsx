'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { formatINR } from '@/lib/format'
import { ClaimType, CLAIM_TYPE_CONFIG, ContractClaim } from '@/lib/types/claims'
import { ContractRecord } from '@/lib/types/contract'
import { ContractEvent, DetailedHindrance } from '@/lib/types/contractDefense'
import { EOTCase } from '@/lib/types/eot'
import { EvidenceRecord } from '@/lib/types/evidence'
import { CorrespondenceRecord } from '@/lib/types/correspondence'
import { BOQItem } from '@/lib/types/boq'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: (claim: ContractClaim) => void
  projects: Array<{ id: string; name: string }>
  contracts: ContractRecord[]
  contractEvents: ContractEvent[]
  hindrances: DetailedHindrance[]
  eotCases: EOTCase[]
  evidenceList: EvidenceRecord[]
  correspondenceList: CorrespondenceRecord[]
  boqItems: BOQItem[]
  preselectedProjectId?: string
}

export function NewClaimModal({
  isOpen,
  onClose,
  onSuccess,
  projects,
  contracts,
  contractEvents,
  hindrances,
  eotCases,
  evidenceList,
  correspondenceList,
  boqItems,
  preselectedProjectId,
}: Props) {
  const toast = useToast()
  const supabase = createClient()

  const [submitting, setSubmitting] = useState(false)
  const [projectId, setProjectId] = useState<string>(
    preselectedProjectId && preselectedProjectId !== 'all'
      ? preselectedProjectId
      : projects[0]?.id || ''
  )
  const [contractId, setContractId] = useState<string>('')
  const [claimType, setClaimType] = useState<ClaimType>('IDLE_MACHINERY')
  const [claimNumber, setClaimNumber] = useState(
    `CLM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`
  )
  const [title, setTitle] = useState('')
  const [claimDate, setClaimDate] = useState(new Date().toISOString().split('T')[0])
  const [claimedAmount, setClaimedAmount] = useState<number>(0)
  const [description, setDescription] = useState('')
  const [basisOfClaim, setBasisOfClaim] = useState('GCC Clause 10CC / Clause 2')

  // Relational Array Selections
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([])
  const [selectedHindranceIds, setSelectedHindranceIds] = useState<string[]>([])
  const [selectedEOTCaseIds, setSelectedEOTCaseIds] = useState<string[]>([])
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([])
  const [selectedCorrespondenceIds, setSelectedCorrespondenceIds] = useState<string[]>([])
  const [selectedBoqIds, setSelectedBoqIds] = useState<string[]>([])

  if (!isOpen) return null

  // Filter project-specific records
  const projEvents = contractEvents.filter(e => e.project_id === projectId)
  const projHindrances = hindrances.filter(h => h.project_id === projectId)
  const projEOTs = eotCases.filter(e => e.project_id === projectId)
  const projEvidence = evidenceList.filter(ev => ev.project_id === projectId)
  const projLetters = correspondenceList.filter(c => c.project_id === projectId)
  const projBoq = boqItems.filter(b => b.project_id === projectId)

  const toggleSelection = (id: string, list: string[], setList: (v: string[]) => void) => {
    if (list.includes(id)) {
      setList(list.filter(x => x !== id))
    } else {
      setList([...list, id])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectId) {
      toast.error('Please select a project.')
      return
    }
    if (!claimNumber.trim() || !title.trim()) {
      toast.error('Please provide a claim number and title.')
      return
    }
    if (claimedAmount <= 0) {
      toast.error('Claimed amount must be greater than zero.')
      return
    }
    if (!description.trim()) {
      toast.error('Please provide a factual description.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        project_id: projectId,
        contract_id: contractId || null,
        claim_number: claimNumber.trim(),
        claim_type: claimType,
        title: title.trim(),
        claim_date: claimDate,
        claimed_amount: claimedAmount,
        approved_amount: 0,
        paid_amount: 0,
        outstanding_amount: claimedAmount,
        description: description.trim(),
        basis_of_claim: basisOfClaim.trim() || null,
        status: 'DRAFT',
        event_ids: selectedEventIds,
        hindrance_ids: selectedHindranceIds,
        eot_case_ids: selectedEOTCaseIds,
        evidence_ids: selectedEvidenceIds,
        correspondence_ids: selectedCorrespondenceIds,
        boq_item_ids: selectedBoqIds,
      }

      const { data, error } = await supabase
        .from('contract_claims')
        .insert(payload)
        .select(
          '*, projects(id, name, agency_name, awarded_amount), contracts(id, agreement_number, contract_title)'
        )
        .single()

      if (error) throw error

      toast.success(`Claim dossier ${claimNumber} created successfully.`)
      onSuccess(data)
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to create claim dossier.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              New Contractual Claim Dossier
            </h2>
            <p className="text-xs text-slate-500">
              Compile factual damages based on contemporaneous site records.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1 rounded-lg"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
          {/* Project & Contract */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Project *
              </label>
              <select
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-semibold"
                required
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Contract Master Link
              </label>
              <select
                value={contractId}
                onChange={e => setContractId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              >
                <option value="">-- General / Main Contract --</option>
                {contracts
                  .filter(c => !projectId || c.project_id === projectId)
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {c.agreement_number} {c.contract_title ? `- ${c.contract_title}` : ''}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Type & Claim Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Claim Category *
              </label>
              <select
                value={claimType}
                onChange={e => setClaimType(e.target.value as ClaimType)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-bold"
              >
                {Object.entries(CLAIM_TYPE_CONFIG).map(([k, cfg]) => (
                  <option key={k} value={k}>
                    {cfg.icon} {cfg.label} ({cfg.clauseRef})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Claim Reference Number *
              </label>
              <input
                type="text"
                value={claimNumber}
                onChange={e => setClaimNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-600"
                required
              />
            </div>
          </div>

          {/* Head of Claim (Title) & Claim Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Head of Claim (Title) *
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Idle charges for 50T Crane and Transit Mixers due to drawing delay"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-semibold"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Claim Date *
              </label>
              <input
                type="date"
                value={claimDate}
                onChange={e => setClaimDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                required
              />
            </div>
          </div>

          {/* Claimed Amount & Clause Basis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-purple-50/60 p-3 rounded-xl border border-purple-200">
            <div>
              <label className="block text-[11px] font-bold text-purple-900 uppercase tracking-wider mb-1">
                Claimed Amount (₹) *
              </label>
              <input
                type="number"
                step="any"
                value={claimedAmount}
                onChange={e => setClaimedAmount(Number(e.target.value))}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-purple-300 rounded-xl text-sm font-mono font-bold text-purple-900 bg-white focus:outline-none focus:border-purple-600"
                required
              />
              <span className="text-[10px] text-purple-700 mt-1 block">
                Formatted: {formatINR(claimedAmount)}
              </span>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-purple-900 uppercase tracking-wider mb-1">
                Contractual Basis / Clause Reference
              </label>
              <input
                type="text"
                value={basisOfClaim}
                onChange={e => setBasisOfClaim(e.target.value)}
                placeholder="e.g. GCC Clause 10CC / CPWD Clause 2 / Dispute Clause 25"
                className="w-full px-3 py-2 border border-purple-300 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:border-purple-600"
              />
            </div>
          </div>

          {/* Factual Narrative */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Factual Contemporaneous Narrative &amp; Damage Quantification *
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="State the chronological sequence of events, instructions received, loss suffered, and formula applied..."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              required
            />
          </div>

          {/* RELATIONAL RECORD LINKING MATRIX */}
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-3">
            <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
              Link Supporting Business Records (Contemporaneous Substantiation)
            </span>

            {/* 1. Contract Events */}
            {projEvents.length > 0 && (
              <div>
                <span className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                  Contract Events ({selectedEventIds.length} selected)
                </span>
                <div className="max-h-24 overflow-y-auto space-y-1 bg-white p-2 rounded-lg border border-slate-200">
                  {projEvents.map(ev => (
                    <label key={ev.id} className="flex items-center gap-2 text-[11px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEventIds.includes(ev.id)}
                        onChange={() => toggleSelection(ev.id, selectedEventIds, setSelectedEventIds)}
                        className="rounded text-blue-600"
                      />
                      <span className="font-mono font-bold text-slate-900">{ev.event_number}:</span>
                      <span className="text-slate-700 truncate">{ev.description}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Hindrances */}
            {projHindrances.length > 0 && (
              <div>
                <span className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                  Hindrances on Record ({selectedHindranceIds.length} selected)
                </span>
                <div className="max-h-24 overflow-y-auto space-y-1 bg-white p-2 rounded-lg border border-slate-200">
                  {projHindrances.map(h => (
                    <label key={h.id} className="flex items-center gap-2 text-[11px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedHindranceIds.includes(h.id)}
                        onChange={() => toggleSelection(h.id, selectedHindranceIds, setSelectedHindranceIds)}
                        className="rounded text-blue-600"
                      />
                      <span className="font-mono font-bold text-slate-900">{h.hindrance_number || 'Appx 21'}:</span>
                      <span className="text-slate-700 truncate">{h.description}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Evidence Vault Proofs */}
            {projEvidence.length > 0 && (
              <div>
                <span className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                  Evidence Vault Proofs ({selectedEvidenceIds.length} selected)
                </span>
                <div className="max-h-24 overflow-y-auto space-y-1 bg-white p-2 rounded-lg border border-slate-200">
                  {projEvidence.map(ev => (
                    <label key={ev.id} className="flex items-center gap-2 text-[11px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEvidenceIds.includes(ev.id)}
                        onChange={() => toggleSelection(ev.id, selectedEvidenceIds, setSelectedEvidenceIds)}
                        className="rounded text-blue-600"
                      />
                      <span className="font-mono text-slate-500">[{ev.evidence_number}]</span>
                      <span className="text-slate-800 font-semibold truncate">{ev.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Statutory Letters & Notices */}
            {projLetters.length > 0 && (
              <div>
                <span className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                  Statutory Notices &amp; Letters ({selectedCorrespondenceIds.length} selected)
                </span>
                <div className="max-h-24 overflow-y-auto space-y-1 bg-white p-2 rounded-lg border border-slate-200">
                  {projLetters.map(c => (
                    <label key={c.id} className="flex items-center gap-2 text-[11px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCorrespondenceIds.includes(c.id)}
                        onChange={() => toggleSelection(c.id, selectedCorrespondenceIds, setSelectedCorrespondenceIds)}
                        className="rounded text-blue-600"
                      />
                      <span className="font-mono font-bold text-slate-900">Let #{c.letter_number}:</span>
                      <span className="text-slate-700 truncate">{c.subject}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating Dossier...' : 'Create Claim Dossier'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
