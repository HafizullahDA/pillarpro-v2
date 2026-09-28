'use client'

import { useState, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FieldWrapper } from '@/components/ui/FormField'
import { useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import {
  CorrespondenceRecord,
  CorrespondenceDirection,
  CorrespondenceCategory,
  CorrespondenceStatus,
  CORRESPONDENCE_CATEGORY_CONFIG,
  STANDARD_GOVERNMENT_NOTICE_RULES,
  ContractNoticeRule,
} from '@/lib/types/correspondence'
import { ContractRecord } from '@/lib/types/contract'
import { BOQItem } from '@/lib/types/boq'
import { ContractEvent, DetailedHindrance } from '@/lib/types/contractDefense'
import { calculateNoticeDeadline } from '@/lib/calculations/correspondenceDeadlines'
import { uploadDocumentToStorage } from '@/lib/storage'

interface NewCorrespondenceModalProps {
  open: boolean
  onClose: () => void
  projects: { id: string; name: string }[]
  contracts: ContractRecord[]
  boqItems?: BOQItem[]
  contractEvents?: ContractEvent[]
  hindrances?: DetailedHindrance[]
  eotApplications?: any[]
  noticeRules?: ContractNoticeRule[]
  defaultProjectId?: string
  defaultDirection?: CorrespondenceDirection
  defaultCategory?: CorrespondenceCategory
  defaultContractEventId?: string
  defaultHindranceId?: string
  onSuccess: (newRecord: CorrespondenceRecord) => void
}

export function NewCorrespondenceModal({
  open,
  onClose,
  projects,
  contracts,
  boqItems = [],
  contractEvents = [],
  hindrances = [],
  eotApplications = [],
  noticeRules = [],
  defaultProjectId,
  defaultDirection = 'INCOMING',
  defaultCategory = 'CORRESPONDENCE',
  defaultContractEventId,
  defaultHindranceId,
  onSuccess,
}: NewCorrespondenceModalProps) {
  const supabase = createClient()
  const { success, error: toastError } = useToast()

  const [projectId, setProjectId] = useState<string>(defaultProjectId || projects[0]?.id || '')
  const [contractId, setContractId] = useState<string>('')
  const [direction, setDirection] = useState<CorrespondenceDirection>(defaultDirection)
  const [category, setCategory] = useState<CorrespondenceCategory>(defaultCategory)
  const [letterNumber, setLetterNumber] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [sender, setSender] = useState(
    defaultDirection === 'INCOMING' ? 'Executive Engineer, PWD' : 'Contractor Project Manager'
  )
  const [recipient, setRecipient] = useState(
    defaultDirection === 'INCOMING' ? 'M/s Contractor' : 'Executive Engineer, PWD'
  )
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')

  // Relational Links
  const [contractEventId, setContractEventId] = useState<string>(defaultContractEventId || '')
  const [hindranceId, setHindranceId] = useState<string>(defaultHindranceId || '')
  const [boqItemId, setBoqItemId] = useState<string>('')
  const [raBillId, setRaBillId] = useState<string>('')
  const [eotId, setEotId] = useState<string>('')
  const [claimId, setClaimId] = useState<string>('')

  // Attachment
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [attachmentUrlInput, setAttachmentUrlInput] = useState('')

  // Notice Period & Deadline Arithmetic (Transparent formula)
  const [responseRequired, setResponseRequired] = useState(true)
  const [selectedClause, setSelectedClause] = useState<string>('Clause 5 (CPWD GCC)')
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0])
  const [noticePeriodDays, setNoticePeriodDays] = useState<number>(14)
  const [customDeadline, setCustomDeadline] = useState('')
  const [useCustomDeadline, setUseCustomDeadline] = useState(false)

  // Status & Dispatch Details
  const [status, setStatus] = useState<CorrespondenceStatus>(
    defaultDirection === 'INCOMING' ? 'RECEIVED' : 'SENT'
  )
  const [modeOfDispatch, setModeOfDispatch] = useState('Speed Post with A/D')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Filter dropdowns by selected project
  const projectContracts = contracts.filter(c => c.project_id === projectId)
  const projectBoq = boqItems.filter(b => b.project_id === projectId)
  const projectEvents = contractEvents.filter(e => e.project_id === projectId)
  const projectHindrances = hindrances.filter(h => h.project_id === projectId)
  const projectEOTs = eotApplications.filter(e => e.project_id === projectId)

  // All available notice rules (Standard rules + any custom rules for this contract)
  const availableRules = useMemo(() => {
    return [...STANDARD_GOVERNMENT_NOTICE_RULES, ...noticeRules]
  }, [noticeRules])

  // Transparent deadline calculation
  const deadlineCalc = useMemo(() => {
    return calculateNoticeDeadline(eventDate, noticePeriodDays)
  }, [eventDate, noticePeriodDays])

  const handleClauseChange = (clauseRef: string) => {
    setSelectedClause(clauseRef)
    const rule = availableRules.find(r => r.clause_reference === clauseRef)
    if (rule) {
      setNoticePeriodDays(rule.notice_period_days)
    }
  }

  const handleDirectionChange = (newDir: CorrespondenceDirection) => {
    setDirection(newDir)
    if (newDir === 'INCOMING') {
      setSender('Executive Engineer, PWD')
      setRecipient('Contractor Project Office')
      setStatus('RECEIVED')
    } else {
      setSender('Contractor Project Manager')
      setRecipient('Executive Engineer, PWD')
      setStatus('SENT')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectId) {
      toastError('Please select a project.')
      return
    }
    if (!letterNumber.trim()) {
      toastError('Please provide an official Letter / Dispatch Number.')
      return
    }
    if (!subject.trim()) {
      toastError('Please enter a subject.')
      return
    }

    setSubmitting(true)
    try {
      let finalAttachmentUrl = attachmentUrlInput.trim() || null
      let fileName = selectedFile?.name || null
      let fileSize = selectedFile?.size || 0

      if (selectedFile) {
        try {
          const folder = `correspondence/${projectId}`
          finalAttachmentUrl = await uploadDocumentToStorage(folder, selectedFile, selectedFile.name, 'documents')
        } catch (uploadErr) {
          console.warn('Storage bucket fallback', uploadErr)
          finalAttachmentUrl = URL.createObjectURL(selectedFile)
        }
      }

      const finalDeadline = responseRequired
        ? (useCustomDeadline ? customDeadline : deadlineCalc.calculatedDeadline)
        : null

      const refPrefix = category === 'NOTICE' ? 'NOT' : category === 'SITE_INSTRUCTION' ? 'SI' : 'COR'
      const refNumber = `${refPrefix}-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`

      const payload: any = {
        project_id: projectId,
        contract_id: contractId || null,
        reference_number: refNumber,
        letter_number: letterNumber.trim(),
        date,
        direction,
        category,
        sender: sender.trim(),
        recipient: recipient.trim(),
        subject: subject.trim(),
        description: description.trim() || null,
        related_contract_event_id: contractEventId || null,
        related_hindrance_id: hindranceId || null,
        related_boq_item_id: boqItemId || null,
        related_ra_bill_id: raBillId || null,
        related_eot_id: eotId || null,
        related_claim_id: claimId.trim() || null,
        attachment_url: finalAttachmentUrl,
        attachment_name: fileName,
        attachment_size_bytes: fileSize,
        response_required: responseRequired,
        response_deadline: finalDeadline,
        clause_reference: responseRequired ? selectedClause : null,
        notice_period_days: responseRequired ? noticePeriodDays : null,
        event_date: responseRequired ? eventDate : null,
        status,
        mode_of_dispatch: modeOfDispatch,
        tracking_consignment_number: trackingNumber.trim() || null,
      }

      const { data, error } = await supabase
        .from('contract_correspondence')
        .insert(payload)
        .select()
        .single()

      if (error) throw error

      success(`Communication ${letterNumber} logged successfully.`)
      onSuccess(data as CorrespondenceRecord)
      onClose()
    } catch (err: any) {
      toastError(err?.message || 'Failed to save communication record.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Log ${direction === 'INCOMING' ? 'Incoming' : 'Outgoing'} ${CORRESPONDENCE_CATEGORY_CONFIG[category]?.label || 'Letter'}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left text-xs text-slate-700">
        {/* Legal Disclaimer Notice */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-amber-900 flex items-start gap-2">
          <span className="text-sm shrink-0">⚖️</span>
          <p className="text-[11px] leading-relaxed">
            <b>Record-Keeping &amp; Deadline Tracker:</b> Tracks contractual dates, notice clocks, and dispatch receipts per contract conditions. Does not constitute legal advice or warrant legal validity.
          </p>
        </div>

        {/* Direction & Category Switcher */}
        <div className="grid grid-cols-2 gap-3">
          <FieldWrapper label="Direction *" required>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDirectionChange('INCOMING')}
                className={`py-2 px-3 rounded-xl font-bold border transition-all cursor-pointer ${
                  direction === 'INCOMING'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                &darr; Incoming
              </button>
              <button
                type="button"
                onClick={() => handleDirectionChange('OUTGOING')}
                className={`py-2 px-3 rounded-xl font-bold border transition-all cursor-pointer ${
                  direction === 'OUTGOING'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                &uarr; Outgoing
              </button>
            </div>
          </FieldWrapper>

          <FieldWrapper label="Category *" required>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as CorrespondenceCategory)}
              className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-2xs focus:border-blue-600 focus:outline-none"
            >
              {Object.entries(CORRESPONDENCE_CATEGORY_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </FieldWrapper>
        </div>

        {/* Project & Contract Hierarchy */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FieldWrapper label="Project *" required>
            <select
              value={projectId}
              onChange={e => {
                setProjectId(e.target.value)
                setContractId('')
              }}
              className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-semibold shadow-2xs"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </FieldWrapper>

          <FieldWrapper label="Contract Master">
            <select
              value={contractId}
              onChange={e => setContractId(e.target.value)}
              className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs"
            >
              <option value="">-- Project Level / Primary Contract --</option>
              {projectContracts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.agreement_number}: {c.contract_title || 'Contract'}
                </option>
              ))}
            </select>
          </FieldWrapper>
        </div>

        {/* Letter Number & Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FieldWrapper label="Official Letter / Dispatch No. *" required>
            <input
              type="text"
              required
              value={letterNumber}
              onChange={e => setLetterNumber(e.target.value)}
              placeholder="e.g. EE/PWD/R&B/BAR/2026/894"
              className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs font-mono font-semibold"
            />
          </FieldWrapper>

          <FieldWrapper label="Letter Date *" required>
            <input
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs"
            />
          </FieldWrapper>
        </div>

        {/* Sender & Recipient */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FieldWrapper label="Sender *" required>
            <input
              type="text"
              required
              value={sender}
              onChange={e => setSender(e.target.value)}
              placeholder="e.g. Executive Engineer, R&B Division"
              className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs"
            />
          </FieldWrapper>

          <FieldWrapper label="Recipient *" required>
            <input
              type="text"
              required
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              placeholder="e.g. M/s PillarPro Construction Pvt Ltd"
              className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs"
            />
          </FieldWrapper>
        </div>

        {/* Subject & Description */}
        <FieldWrapper label="Subject *" required>
          <input
            type="text"
            required
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="e.g. Notice of hindrance due to unshifted HT electrical lines at Km 4+200"
            className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs font-semibold"
          />
        </FieldWrapper>

        <FieldWrapper label="Description / Summary of Points">
          <textarea
            rows={2}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Key demands, contractual citations, instructions, or response commitments..."
            className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-blue-600 focus:outline-none"
          />
        </FieldWrapper>

        {/* TRANSPARENT NOTICE PERIOD & DEADLINE CALCULATOR */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 text-xs">
              <input
                type="checkbox"
                checked={responseRequired}
                onChange={e => setResponseRequired(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300"
              />
              <span>Contractual Response / Notice Deadline Tracking</span>
            </label>
            <span className="text-[10px] font-mono text-slate-500">Contract / Clause Level Rules</span>
          </div>

          {responseRequired && (
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FieldWrapper label="Contract Clause">
                  <select
                    value={selectedClause}
                    onChange={e => handleClauseChange(e.target.value)}
                    className="block w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                  >
                    {availableRules.map(r => (
                      <option key={r.clause_reference} value={r.clause_reference}>
                        {r.clause_reference} ({r.notice_period_days}d)
                      </option>
                    ))}
                    <option value="Custom">Custom Clause Rule</option>
                  </select>
                </FieldWrapper>

                <FieldWrapper label="Event / Occurrence Date *" required>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={e => setEventDate(e.target.value)}
                    className="block w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                  />
                </FieldWrapper>

                <FieldWrapper label="Notice Period (Days) *" required>
                  <input
                    type="number"
                    min="1"
                    required
                    value={noticePeriodDays}
                    onChange={e => setNoticePeriodDays(Number(e.target.value))}
                    className="block w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 font-bold"
                  />
                </FieldWrapper>
              </div>

              {/* Transparent Calculation Display */}
              <div className="bg-white p-3 rounded-xl border border-blue-200 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Calculated Notice Deadline:</span>
                  <span className="font-black text-blue-700 font-mono text-sm">
                    {deadlineCalc.calculatedDeadline}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 font-mono bg-slate-50 p-2 rounded border border-slate-200">
                  {deadlineCalc.formulaExplanation}
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span>Status: <b className="text-slate-800">{deadlineCalc.urgencyLabel}</b></span>
                  <label className="flex items-center gap-1 cursor-pointer text-slate-500 text-[10px]">
                    <input
                      type="checkbox"
                      checked={useCustomDeadline}
                      onChange={e => setUseCustomDeadline(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span>Override with custom date</span>
                  </label>
                </div>

                {useCustomDeadline && (
                  <div className="pt-2">
                    <FieldWrapper label="Explicit Custom Deadline">
                      <input
                        type="date"
                        value={customDeadline}
                        onChange={e => setCustomDeadline(e.target.value)}
                        className="block w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                      />
                    </FieldWrapper>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Relational Linking */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5">
          <p className="font-bold text-slate-900 text-xs">
            Link to Business Records (Measurements, Delays, EOT, Bills)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FieldWrapper label="Related Contract Event">
              <select
                value={contractEventId}
                onChange={e => setContractEventId(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
              >
                <option value="">-- None --</option>
                {projectEvents.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {ev.event_number}: {ev.description.slice(0, 35)}...
                  </option>
                ))}
              </select>
            </FieldWrapper>

            <FieldWrapper label="Related Hindrance">
              <select
                value={hindranceId}
                onChange={e => setHindranceId(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
              >
                <option value="">-- None --</option>
                {projectHindrances.map(h => (
                  <option key={h.id} value={h.id}>
                    Hindrance #{h.hindrance_number}: {h.description.slice(0, 35)}...
                  </option>
                ))}
              </select>
            </FieldWrapper>

            <FieldWrapper label="Related BOQ Item">
              <select
                value={boqItemId}
                onChange={e => setBoqItemId(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
              >
                <option value="">-- None --</option>
                {projectBoq.map(b => (
                  <option key={b.id} value={b.id}>
                    Item {b.item_number}: {b.description.slice(0, 35)}...
                  </option>
                ))}
              </select>
            </FieldWrapper>

            <FieldWrapper label="Related EOT Application">
              <select
                value={eotId}
                onChange={e => setEotId(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
              >
                <option value="">-- None --</option>
                {projectEOTs.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.application_number}
                  </option>
                ))}
              </select>
            </FieldWrapper>
          </div>
        </div>

        {/* Attachment & Dispatch Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FieldWrapper label="Status *" required>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as CorrespondenceStatus)}
              className="block w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 font-semibold"
            >
              <option value="DRAFT">DRAFT</option>
              <option value="SENT">SENT</option>
              <option value="RECEIVED">RECEIVED</option>
              <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
              <option value="RESPONSE_REQUIRED">RESPONSE REQUIRED</option>
              <option value="RESPONDED">RESPONDED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </FieldWrapper>

          <FieldWrapper label="Mode of Dispatch">
            <select
              value={modeOfDispatch}
              onChange={e => setModeOfDispatch(e.target.value)}
              className="block w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
            >
              <option value="Speed Post with A/D">Speed Post with A/D</option>
              <option value="Registered Post">Registered Post</option>
              <option value="Hand Delivery / Site Book">Hand Delivery / Site Book</option>
              <option value="Official Email">Official Email</option>
              <option value="Special Messenger">Special Messenger</option>
            </select>
          </FieldWrapper>

          <FieldWrapper label="Postal / Consignment No.">
            <input
              type="text"
              value={trackingNumber}
              onChange={e => setTrackingNumber(e.target.value)}
              placeholder="e.g. EK849204918IN"
              className="block w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 font-mono"
            />
          </FieldWrapper>
        </div>

        {/* File Attachment */}
        <FieldWrapper label="Attach Signed Document / Scan (PDF/Image)">
          <input
            type="file"
            onChange={e => {
              if (e.target.files?.[0]) setSelectedFile(e.target.files[0])
            }}
            className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
        </FieldWrapper>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {submitting ? 'Saving Communication…' : 'Record in Register'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
