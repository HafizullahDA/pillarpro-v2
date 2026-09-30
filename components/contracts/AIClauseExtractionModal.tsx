'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FieldWrapper } from '@/components/ui/FormField'
import { useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import {
  ContractClause,
  CandidateContractParams,
  AIClauseExtractionResult,
  CLAUSE_CATEGORY_CONFIG,
} from '@/lib/types/contractClauses'
import { ContractDocument, ContractRecord } from '@/lib/types/contract'
import { formatINR } from '@/lib/format'

interface AIClauseExtractionModalProps {
  open: boolean
  onClose: () => void
  contract: ContractRecord
  existingDocuments: ContractDocument[]
  onClausesSaved: (newClauses: ContractClause[]) => void
  onContractUpdated?: (updatedContract: ContractRecord) => void
}

export function AIClauseExtractionModal({
  open,
  onClose,
  contract,
  existingDocuments,
  onClausesSaved,
  onContractUpdated,
}: AIClauseExtractionModalProps) {
  const supabase = createClient()
  const { success, error: toastError } = useToast()

  const [inputMode, setInputMode] = useState<'text' | 'file'>('text')
  const [documentTitle, setDocumentTitle] = useState('Agreement & GCC Excerpt')
  const [documentText, setDocumentText] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

  const [extractionResult, setExtractionResult] = useState<AIClauseExtractionResult | null>(null)
  const [candidateParams, setCandidateParams] = useState<CandidateContractParams | null>(null)
  const [candidateClauses, setCandidateClauses] = useState<any[]>([])
  const [savingClauses, setSavingClauses] = useState(false)
  const [applyingParams, setApplyingParams] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)
      if (!documentTitle || documentTitle === 'Agreement & GCC Excerpt') {
        setDocumentTitle(file.name.replace(/\.[^/.]+$/, ''))
      }
    }
  }

  const handleStartAnalysis = async () => {
    if (inputMode === 'text' && !documentText.trim()) {
      toastError('Please paste contract excerpt text to analyze.')
      return
    }

    if (inputMode === 'file' && !selectedFile) {
      toastError('Please choose a contract document file.')
      return
    }

    setAnalyzing(true)
    try {
      let payload: any = {
        documentTitle,
        contractType: contract.contract_type,
      }

      if (inputMode === 'text') {
        payload.documentText = documentText
      } else if (selectedFile) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(selectedFile)
        })
        payload.documentBase64 = base64
      }

      const res = await fetch('/api/contract-clauses/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}))
        throw new Error(errorJson.error || 'Failed to extract clauses from document.')
      }

      const data: AIClauseExtractionResult = await res.json()
      setExtractionResult(data)
      setCandidateParams(data.candidate_params || null)
      setCandidateClauses(data.extracted_clauses || [])
      success(`Extracted ${data.extracted_clauses.length} candidate clauses for review.`)
    } catch (err: any) {
      console.error('Error during AI clause extraction:', err)
      toastError(err.message || 'AI extraction failed. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleUpdateCandidateClause = (idx: number, updates: any) => {
    setCandidateClauses(prev => prev.map((c, i) => (i === idx ? { ...c, ...updates } : c)))
  }

  const handleRemoveCandidateClause = (idx: number) => {
    setCandidateClauses(prev => prev.filter((_, i) => i !== idx))
  }

  const handleApplyParams = async () => {
    if (!candidateParams) return
    setApplyingParams(true)
    try {
      const updates: any = {}
      if (candidateParams.contract_value) updates.awarded_amount = candidateParams.contract_value
      if (candidateParams.completion_date) {
        updates.original_completion_date = candidateParams.completion_date
        updates.current_completion_date = candidateParams.completion_date
      }
      if (candidateParams.dlp_months) updates.dlp_months = candidateParams.dlp_months
      if (candidateParams.earnest_money_deposit) updates.earnest_money_deposit = candidateParams.earnest_money_deposit
      if (candidateParams.performance_security_percent) updates.performance_security_percent = candidateParams.performance_security_percent
      if (candidateParams.security_deposit_percent) updates.security_deposit_percent = candidateParams.security_deposit_percent
      if (candidateParams.retention_percentage) updates.retention_percentage = candidateParams.retention_percentage
      if (candidateParams.liquidated_damages_percent_per_week) updates.liquidated_damages_percent_per_week = candidateParams.liquidated_damages_percent_per_week
      if (candidateParams.eot_notice_days) updates.eot_notice_days = candidateParams.eot_notice_days

      const { data, error } = await supabase
        .from('contracts')
        .update(updates)
        .eq('id', contract.id)
        .select()
        .single()

      if (error) throw error

      success('Contract Master parameters updated with extracted values.')
      if (onContractUpdated && data) {
        onContractUpdated(data as ContractRecord)
      }
    } catch (err: any) {
      console.error('Error applying candidate parameters:', err)
      toastError(err.message || 'Failed to update contract parameters.')
    } finally {
      setApplyingParams(false)
    }
  }

  const handleSaveClauses = async (defaultStatus: 'DRAFT' | 'APPROVED' = 'DRAFT') => {
    if (candidateClauses.length === 0) {
      toastError('No candidate clauses to save.')
      return
    }

    setSavingClauses(true)
    try {
      const rowsToInsert = candidateClauses.map(c => ({
        contract_id: contract.id,
        clause_number: c.clause_number,
        clause_title: c.clause_title,
        clause_text: c.clause_text,
        category: c.category,
        notice_period_days: c.notice_period_days || null,
        payment_requirement: c.payment_requirement || null,
        eot_relevance: Boolean(c.eot_relevance),
        variation_relevance: Boolean(c.variation_relevance),
        claim_relevance: Boolean(c.claim_relevance),
        bg_relevance: Boolean(c.bg_relevance),
        retention_relevance: Boolean(c.retention_relevance),
        ld_relevance: Boolean(c.ld_relevance),
        escalation_relevance: Boolean(c.escalation_relevance),
        status: c.status || defaultStatus,
        source_page_ref: c.source_page_ref || null,
        source_document_title: documentTitle || null,
        is_ai_extracted: true,
        ai_confidence_score: c.ai_confidence_score || 0.85,
        ai_extraction_notes: 'AI extracted — verify against original contract.',
        verified_at: (c.status || defaultStatus) === 'APPROVED' ? new Date().toISOString() : null,
      }))

      const { data, error } = await supabase
        .from('contract_clauses')
        .insert(rowsToInsert)
        .select('*, contract_documents(id, title, document_type)')

      if (error) throw error

      success(`Successfully saved ${data.length} contract clauses.`)
      onClausesSaved(data as ContractClause[])
      onClose()
    } catch (err: any) {
      console.error('Error saving extracted clauses:', err)
      toastError(err.message || 'Failed to save extracted clauses.')
    } finally {
      setSavingClauses(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Scan & Extract Contract Clauses (AI Assistant)"
    >
      <div className="space-y-5 text-xs max-h-[75vh] overflow-y-auto pr-1">
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-amber-950 flex items-start gap-2.5">
          <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-[11px] leading-relaxed">
            <span className="font-bold block">AI Extracted — Verify Against Original Contract</span>
            AI extracts candidate commercial parameters and clauses for your convenience. All extracted items are marked as <b>DRAFT / UNVERIFIED</b> and will not drive automated notice deadlines until explicitly approved by you.
          </div>
        </div>

        {!extractionResult && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setInputMode('text')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  inputMode === 'text' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Paste Document Text
              </button>
              <button
                type="button"
                onClick={() => setInputMode('file')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  inputMode === 'file' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Upload File (PDF / Image)
              </button>
            </div>

            <FieldWrapper label="Source Document Title / Reference" required>
              <input
                type="text"
                value={documentTitle}
                onChange={e => setDocumentTitle(e.target.value)}
                placeholder="e.g. CPWD General Conditions of Contract (GCC) 2024"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </FieldWrapper>

            {inputMode === 'text' ? (
              <FieldWrapper label="Paste Contract Text Excerpt" required>
                <textarea
                  rows={8}
                  value={documentText}
                  onChange={e => setDocumentText(e.target.value)}
                  placeholder="Paste clause sections (e.g. Clause 2, Clause 5, Clause 10CC, Clause 12, payment conditions, DLP terms)..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-800 focus:border-blue-600 focus:outline-none"
                />
              </FieldWrapper>
            ) : (
              <FieldWrapper label="Select Contract Document (PDF / Scan)">
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </FieldWrapper>
            )}

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                onClick={handleStartAnalysis}
                disabled={analyzing}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {analyzing ? 'Analyzing Contract Clauses...' : 'Scan & Extract Clauses'}
              </Button>
            </div>
          </div>
        )}

        {extractionResult && (
          <div className="space-y-5">
            {candidateParams && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Extracted Commercial Parameters
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Candidate values discovered in document header/summary.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleApplyParams}
                    disabled={applyingParams}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    {applyingParams ? 'Applying...' : 'Apply to Contract Master'}
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">Contract Value</span>
                    <span className="font-bold text-slate-900">
                      {candidateParams.contract_value ? formatINR(candidateParams.contract_value) : 'Not found'}
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">Completion Date</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {candidateParams.completion_date || 'Not found'}
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">DLP Months</span>
                    <span className="font-bold text-slate-900">
                      {candidateParams.dlp_months ? `${candidateParams.dlp_months} Mos` : '12 Mos'}
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">Statutory EOT Window</span>
                    <span className="font-bold text-blue-700">
                      {candidateParams.eot_notice_days ? `${candidateParams.eot_notice_days} Days` : '14 Days'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Candidate Clauses Found ({candidateClauses.length})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Review each clause excerpt and source page reference before approving.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setExtractionResult(null)}
                    className="text-xs"
                  >
                    Re-scan
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSaveClauses('DRAFT')}
                    disabled={savingClauses}
                    variant="secondary"
                    className="text-xs border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100"
                  >
                    Save All as Drafts
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSaveClauses('APPROVED')}
                    disabled={savingClauses}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  >
                    Approve &amp; Save All
                  </Button>
                </div>
              </div>

              <div className="space-y-2.5">
                {candidateClauses.map((c, idx) => {
                  const catConfig = CLAUSE_CATEGORY_CONFIG[c.category as keyof typeof CLAUSE_CATEGORY_CONFIG] || CLAUSE_CATEGORY_CONFIG.OTHER

                  return (
                    <div
                      key={idx}
                      className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2 text-xs shadow-2xs hover:border-slate-300 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 font-mono text-sm">
                            {c.clause_number}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${catConfig.badgeColor}`}>
                            {catConfig.icon} {catConfig.label}
                          </span>
                          {c.notice_period_days && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              Notice: {c.notice_period_days} Days
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 italic">
                            Source: {c.source_page_ref || 'Document'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCandidateClause(idx)}
                            className="text-slate-400 hover:text-rose-600 transition-colors font-bold text-sm"
                            title="Discard clause"
                          >
                            &times;
                          </button>
                        </div>
                      </div>

                      <p className="font-semibold text-slate-800">{c.clause_title}</p>

                      <p className="text-slate-600 font-mono text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100 whitespace-pre-wrap leading-relaxed">
                        {c.clause_text}
                      </p>

                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        <div className="flex items-center gap-3 text-slate-500">
                          {c.eot_relevance && <span className="text-blue-600 font-semibold">&bull; EOT</span>}
                          {c.ld_relevance && <span className="text-rose-600 font-semibold">&bull; LD</span>}
                          {c.escalation_relevance && <span className="text-indigo-600 font-semibold">&bull; Escalation</span>}
                          {c.variation_relevance && <span className="text-amber-600 font-semibold">&bull; Variations</span>}
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={c.status || 'DRAFT'}
                            onChange={e => handleUpdateCandidateClause(idx, { status: e.target.value })}
                            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-800"
                          >
                            <option value="DRAFT">Status: Draft / Unverified</option>
                            <option value="APPROVED">Status: Approved</option>
                            <option value="REJECTED">Status: Rejected</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
