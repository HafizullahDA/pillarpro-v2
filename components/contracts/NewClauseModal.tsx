'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FieldWrapper } from '@/components/ui/FormField'
import { useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import {
  ContractClause,
  ClauseCategory,
  ClauseStatus,
  CLAUSE_CATEGORY_CONFIG,
  ALL_CLAUSE_CATEGORIES,
} from '@/lib/types/contractClauses'
import { ContractDocument } from '@/lib/types/contract'

interface NewClauseModalProps {
  open: boolean
  onClose: () => void
  contractId: string
  existingDocuments: ContractDocument[]
  clauseToEdit?: ContractClause | null
  onSuccess: (savedClause: ContractClause) => void
}

export function NewClauseModal({
  open,
  onClose,
  contractId,
  existingDocuments,
  clauseToEdit,
  onSuccess,
}: NewClauseModalProps) {
  const supabase = createClient()
  const { success, error: toastError } = useToast()

  const [documentId, setDocumentId] = useState<string>('')
  const [clauseNumber, setClauseNumber] = useState('')
  const [clauseTitle, setClauseTitle] = useState('')
  const [clauseText, setClauseText] = useState('')
  const [category, setCategory] = useState<ClauseCategory>('EOT')
  const [noticePeriodDays, setNoticePeriodDays] = useState<string>('')
  const [paymentRequirement, setPaymentRequirement] = useState('')

  const [eotRelevance, setEotRelevance] = useState(false)
  const [variationRelevance, setVariationRelevance] = useState(false)
  const [claimRelevance, setClaimRelevance] = useState(false)
  const [bgRelevance, setBgRelevance] = useState(false)
  const [retentionRelevance, setRetentionRelevance] = useState(false)
  const [ldRelevance, setLdRelevance] = useState(false)
  const [escalationRelevance, setEscalationRelevance] = useState(false)

  const [status, setStatus] = useState<ClauseStatus>('APPROVED')
  const [sourcePageRef, setSourcePageRef] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (clauseToEdit) {
      setDocumentId(clauseToEdit.document_id || '')
      setClauseNumber(clauseToEdit.clause_number)
      setClauseTitle(clauseToEdit.clause_title)
      setClauseText(clauseToEdit.clause_text)
      setCategory(clauseToEdit.category)
      setNoticePeriodDays(
        typeof clauseToEdit.notice_period_days === 'number'
          ? String(clauseToEdit.notice_period_days)
          : ''
      )
      setPaymentRequirement(clauseToEdit.payment_requirement || '')
      setEotRelevance(clauseToEdit.eot_relevance)
      setVariationRelevance(clauseToEdit.variation_relevance)
      setClaimRelevance(clauseToEdit.claim_relevance)
      setBgRelevance(clauseToEdit.bg_relevance)
      setRetentionRelevance(clauseToEdit.retention_relevance)
      setLdRelevance(clauseToEdit.ld_relevance)
      setEscalationRelevance(clauseToEdit.escalation_relevance)
      setStatus(clauseToEdit.status)
      setSourcePageRef(clauseToEdit.source_page_ref || '')
    } else {
      setDocumentId(existingDocuments[0]?.id || '')
      setClauseNumber('')
      setClauseTitle('')
      setClauseText('')
      setCategory('EOT')
      setNoticePeriodDays('')
      setPaymentRequirement('')
      setEotRelevance(false)
      setVariationRelevance(false)
      setClaimRelevance(false)
      setBgRelevance(false)
      setRetentionRelevance(false)
      setLdRelevance(false)
      setEscalationRelevance(false)
      setStatus('APPROVED')
      setSourcePageRef('')
    }
  }, [clauseToEdit, open, existingDocuments])

  const handleCategoryChange = (newCat: ClauseCategory) => {
    setCategory(newCat)
    if (newCat === 'EOT') setEotRelevance(true)
    if (newCat === 'LD') setLdRelevance(true)
    if (newCat === 'ESCALATION') setEscalationRelevance(true)
    if (newCat === 'VARIATION' || newCat === 'DEVIATION') setVariationRelevance(true)
    if (newCat === 'BG' || newCat === 'SECURITY') setBgRelevance(true)
    if (newCat === 'RETENTION') setRetentionRelevance(true)
    if (newCat === 'DISPUTE' || newCat === 'ARBITRATION') setClaimRelevance(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clauseNumber.trim() || !clauseTitle.trim() || !clauseText.trim()) {
      toastError('Please fill in Clause Number, Title, and Clause Text.')
      return
    }

    setSubmitting(true)
    try {
      const doc = existingDocuments.find(d => d.id === documentId)
      const parsedNotice = noticePeriodDays ? parseInt(noticePeriodDays, 10) : null

      const payload = {
        contract_id: contractId,
        document_id: documentId || null,
        clause_number: clauseNumber.trim(),
        clause_title: clauseTitle.trim(),
        clause_text: clauseText.trim(),
        category,
        notice_period_days: isNaN(parsedNotice as number) ? null : parsedNotice,
        payment_requirement: paymentRequirement.trim() || null,
        eot_relevance: eotRelevance,
        variation_relevance: variationRelevance,
        claim_relevance: claimRelevance,
        bg_relevance: bgRelevance,
        retention_relevance: retentionRelevance,
        ld_relevance: ldRelevance,
        escalation_relevance: escalationRelevance,
        status,
        source_page_ref: sourcePageRef.trim() || null,
        source_document_title: doc?.title || null,
        is_ai_extracted: clauseToEdit?.is_ai_extracted || false,
        verified_at: status === 'APPROVED' ? new Date().toISOString() : null,
      }

      let savedData: ContractClause

      if (clauseToEdit) {
        const { data, error } = await supabase
          .from('contract_clauses')
          .update(payload)
          .eq('id', clauseToEdit.id)
          .select('*, contract_documents(id, title, document_type)')
          .single()

        if (error) throw error
        savedData = data as ContractClause
        success('Contract clause updated successfully.')
      } else {
        const { data, error } = await supabase
          .from('contract_clauses')
          .insert(payload)
          .select('*, contract_documents(id, title, document_type)')
          .single()

        if (error) throw error
        savedData = data as ContractClause
        success('Contract clause saved successfully.')
      }

      onSuccess(savedData)
      onClose()
    } catch (err: any) {
      console.error('Error saving contract clause:', err)
      toastError(err.message || 'Failed to save clause.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={clauseToEdit ? `Edit Clause: ${clauseToEdit.clause_number}` : 'Record Contract Clause'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldWrapper label="Source Contract Document">
            <select
              value={documentId}
              onChange={e => setDocumentId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-medium focus:border-blue-600 focus:outline-none"
            >
              <option value="">No specific document attached</option>
              {existingDocuments.map(d => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.document_type})
                </option>
              ))}
            </select>
          </FieldWrapper>

          <FieldWrapper label="Source Page / Para Reference">
            <input
              type="text"
              value={sourcePageRef}
              onChange={e => setSourcePageRef(e.target.value)}
              placeholder="e.g. Page 42, Para 5.2"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </FieldWrapper>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FieldWrapper label="Clause Number" required>
            <input
              type="text"
              required
              value={clauseNumber}
              onChange={e => setClauseNumber(e.target.value)}
              placeholder="e.g. Clause 5, Sub-Clause 20.1"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </FieldWrapper>

          <FieldWrapper label="Clause Category" required>
            <select
              value={category}
              onChange={e => handleCategoryChange(e.target.value as ClauseCategory)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              {ALL_CLAUSE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {CLAUSE_CATEGORY_CONFIG[cat].icon} {CLAUSE_CATEGORY_CONFIG[cat].label}
                </option>
              ))}
            </select>
          </FieldWrapper>

          <FieldWrapper label="Verification Status" required>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as ClauseStatus)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              <option value="APPROVED">Verified &amp; Approved (Drives Deadlines)</option>
              <option value="DRAFT">Draft / Unverified</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </FieldWrapper>
        </div>

        <FieldWrapper label="Clause Title / Heading" required>
          <input
            type="text"
            required
            value={clauseTitle}
            onChange={e => setClauseTitle(e.target.value)}
            placeholder="e.g. Extension of Time for Delay & Hindrances"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"
          />
        </FieldWrapper>

        <FieldWrapper label="Clause Verbatim Text / Excerpt" required>
          <textarea
            required
            rows={4}
            value={clauseText}
            onChange={e => setClauseText(e.target.value)}
            placeholder="Paste verbatim clause text from tender / contract agreement..."
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 leading-relaxed font-mono focus:border-blue-600 focus:outline-none"
          />
        </FieldWrapper>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <FieldWrapper label="Statutory Notice Period (Days)">
            <input
              type="number"
              min="0"
              value={noticePeriodDays}
              onChange={e => setNoticePeriodDays(e.target.value)}
              placeholder="e.g. 14, 28, 30 days"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              If approved, this notice period will power automated deadline calculations.
            </p>
          </FieldWrapper>

          <FieldWrapper label="Payment Terms / Submission Window">
            <input
              type="text"
              value={paymentRequirement}
              onChange={e => setPaymentRequirement(e.target.value)}
              placeholder="e.g. Payment within 30 days of submission"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
            />
          </FieldWrapper>
        </div>

        <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
            Contract Defense &amp; Commercial Relevance
          </label>
          <p className="text-[11px] text-slate-500 mb-2">
            Check all modules that should link to this clause during site execution:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
              <input
                type="checkbox"
                checked={eotRelevance}
                onChange={e => setEotRelevance(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>EOT Relevance</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
              <input
                type="checkbox"
                checked={variationRelevance}
                onChange={e => setVariationRelevance(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Variation Limit</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
              <input
                type="checkbox"
                checked={claimRelevance}
                onChange={e => setClaimRelevance(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Claim / Dispute</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
              <input
                type="checkbox"
                checked={ldRelevance}
                onChange={e => setLdRelevance(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>LD Exposure</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
              <input
                type="checkbox"
                checked={escalationRelevance}
                onChange={e => setEscalationRelevance(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Price Escalation</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
              <input
                type="checkbox"
                checked={bgRelevance}
                onChange={e => setBgRelevance(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>BG / Security</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
              <input
                type="checkbox"
                checked={retentionRelevance}
                onChange={e => setRetentionRelevance(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Retention Money</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
            {submitting ? 'Saving...' : clauseToEdit ? 'Save Changes' : 'Record Clause'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
