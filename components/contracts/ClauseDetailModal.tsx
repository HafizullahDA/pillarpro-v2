'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import {
  ContractClause,
  ClauseStatus,
  CLAUSE_CATEGORY_CONFIG,
} from '@/lib/types/contractClauses'
import { ClauseStatusBadge } from './ClauseStatusBadge'
import { formatDate } from '@/lib/format'

interface ClauseDetailModalProps {
  open: boolean
  onClose: () => void
  clause: ContractClause | null
  onUpdate: (updatedClause: ContractClause) => void
  onDelete: (clauseId: string) => void
  onEdit: (clause: ContractClause) => void
}

export function ClauseDetailModal({
  open,
  onClose,
  clause,
  onUpdate,
  onDelete,
  onEdit,
}: ClauseDetailModalProps) {
  const supabase = createClient()
  const { success, error: toastError } = useToast()
  const [updatingStatus, setUpdatingStatus] = useState(false)

  if (!clause) return null

  const catConfig = CLAUSE_CATEGORY_CONFIG[clause.category] || CLAUSE_CATEGORY_CONFIG.OTHER

  const handleSetStatus = async (newStatus: ClauseStatus) => {
    setUpdatingStatus(true)
    try {
      const updates: any = {
        status: newStatus,
        verified_at: newStatus === 'APPROVED' ? new Date().toISOString() : null,
      }

      const { data, error } = await supabase
        .from('contract_clauses')
        .update(updates)
        .eq('id', clause.id)
        .select('*, contract_documents(id, title, document_type)')
        .single()

      if (error) throw error

      success(
        newStatus === 'APPROVED'
          ? 'Clause approved! It will now drive automated notice and deadline calculations.'
          : `Clause marked as ${newStatus}.`
      )
      onUpdate(data as ContractClause)
    } catch (err: any) {
      console.error('Error updating clause status:', err)
      toastError(err.message || 'Failed to update clause status.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this contract clause record?')) return
    try {
      const { error } = await supabase
        .from('contract_clauses')
        .delete()
        .eq('id', clause.id)

      if (error) throw error
      success('Clause deleted successfully.')
      onDelete(clause.id)
      onClose()
    } catch (err: any) {
      console.error('Error deleting clause:', err)
      toastError(err.message || 'Failed to delete clause.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Clause Details: ${clause.clause_number}`}
    >
      <div className="space-y-4 text-xs text-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-slate-900 font-mono">
                {clause.clause_number}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${catConfig.badgeColor}`}>
                {catConfig.icon} {catConfig.label}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-800 mt-1">{clause.clause_title}</p>
          </div>

          <div>
            <ClauseStatusBadge
              status={clause.status}
              isAiExtracted={clause.is_ai_extracted}
              sourcePageRef={clause.source_page_ref}
            />
          </div>
        </div>

        <div>
          <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block mb-1">
            Verbatim Clause Text
          </span>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 font-mono text-[11px] text-slate-800 leading-relaxed whitespace-pre-wrap">
            {clause.clause_text}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div>
            <span className="text-slate-500 block mb-0.5">Source Document</span>
            <span className="font-semibold text-slate-900">
              {clause.source_document_title || clause.contract_documents?.title || 'Contract Agreement'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block mb-0.5">Page / Section Ref</span>
            <span className="font-semibold text-slate-900">
              {clause.source_page_ref || 'Not specified'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div>
            <span className="text-slate-500 block mb-0.5">Statutory Notice Period</span>
            <span className="font-bold text-blue-700">
              {clause.notice_period_days ? `${clause.notice_period_days} Calendar Days` : 'No explicit notice period'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block mb-0.5">Payment Term / Window</span>
            <span className="font-semibold text-slate-900">
              {clause.payment_requirement || 'Standard cycle'}
            </span>
          </div>
        </div>

        <div>
          <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block mb-1.5">
            Module Linkages &amp; Relevance
          </span>
          <div className="flex flex-wrap gap-1.5">
            {clause.eot_relevance && (
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-semibold text-[10px]">
                EOT &amp; Hindrances
              </span>
            )}
            {clause.ld_relevance && (
              <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 font-semibold text-[10px]">
                Liquidated Damages
              </span>
            )}
            {clause.escalation_relevance && (
              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 font-semibold text-[10px]">
                Price Escalation (10CA/10CC)
              </span>
            )}
            {clause.variation_relevance && (
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[10px]">
                Variations &amp; Deviations
              </span>
            )}
            {clause.claim_relevance && (
              <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 font-semibold text-[10px]">
                Claims &amp; Dispute
              </span>
            )}
            {clause.bg_relevance && (
              <span className="px-2 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-200 font-semibold text-[10px]">
                Bank Guarantee (PBG)
              </span>
            )}
            {clause.retention_relevance && (
              <span className="px-2 py-0.5 rounded bg-yellow-50 text-yellow-800 border border-yellow-200 font-semibold text-[10px]">
                Retention Money
              </span>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {clause.status !== 'APPROVED' ? (
              <Button
                size="sm"
                onClick={() => handleSetStatus('APPROVED')}
                disabled={updatingStatus}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
              >
                Approve Clause (Enable Notice Rules)
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleSetStatus('UNDER_REVIEW')}
                disabled={updatingStatus}
                className="text-xs"
              >
                Move to Under Review
              </Button>
            )}

            {clause.status !== 'REJECTED' && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleSetStatus('REJECTED')}
                disabled={updatingStatus}
                className="text-xs text-rose-700 hover:bg-rose-50"
              >
                Reject
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                onClose()
                onEdit(clause)
              }}
              className="text-xs font-semibold"
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleDelete}
              className="text-xs text-rose-700 hover:bg-rose-50"
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
