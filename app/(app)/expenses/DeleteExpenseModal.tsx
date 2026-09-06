'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { formatINR, formatDate } from '@/lib/format'

export interface ExpenseToDelete {
  id: string
  description: string | null
  amount: number
  date: string
  category: string
  projects?: { name: string } | null
}

interface DeleteExpenseModalProps {
  open: boolean
  onClose: () => void
  expense: ExpenseToDelete | null
  onSuccess: () => void
}

interface LinkedSupplierInfo {
  id: string
  amount: number
  supplierName: string
}

export function DeleteExpenseModal({
  open,
  onClose,
  expense,
  onSuccess,
}: DeleteExpenseModalProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [checkingLink, setCheckingLink] = useState(false)
  const [error, setError] = useState('')
  const [linkedSupplierTx, setLinkedSupplierTx] = useState<LinkedSupplierInfo | null>(null)
  const [deleteSupplierTxToo, setDeleteSupplierTxToo] = useState(false)

  // Check if expense is linked to a supplier transaction
  useEffect(() => {
    if (!open || !expense) {
      setLinkedSupplierTx(null)
      setDeleteSupplierTxToo(false)
      setError('')
      return
    }

    let isMounted = true
    setCheckingLink(true)

    async function checkSupplierLink() {
      try {
        const { data, error: err } = await supabase
          .from('supplier_transactions')
          .select('id, amount, suppliers(name)')
          .eq('expense_id', expense!.id)
          .maybeSingle()

        if (!isMounted) return

        if (!err && data) {
          const supName = (data.suppliers as { name?: string } | null)?.name ?? 'Supplier'
          setLinkedSupplierTx({
            id: data.id,
            amount: Number(data.amount) || 0,
            supplierName: supName,
          })
        } else {
          setLinkedSupplierTx(null)
        }
      } catch (e) {
        console.error('Failed to check linked supplier transaction:', e)
      } finally {
        if (isMounted) setCheckingLink(false)
      }
    }

    checkSupplierLink()

    return () => {
      isMounted = false
    }
  }, [open, expense, supabase])

  if (!expense) return null

  const handleDelete = async () => {
    setLoading(true)
    setError('')

    try {
      // 1. If user opted to delete the linked supplier ledger transaction too
      if (deleteSupplierTxToo && linkedSupplierTx) {
        const { error: supDeleteErr } = await supabase
          .from('supplier_transactions')
          .delete()
          .eq('id', linkedSupplierTx.id)

        if (supDeleteErr) {
          setError(`Failed to delete linked supplier transaction: ${supDeleteErr.message}`)
          setLoading(false)
          return
        }
      }

      // 2. Delete the expense record
      const { error: expDeleteErr } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expense.id)

      if (expDeleteErr) {
        setError(expDeleteErr.message)
        setLoading(false)
        return
      }

      setLoading(false)
      onSuccess()
      onClose()
    } catch (err: any) {
      setLoading(false)
      setError(err.message || 'Failed to delete expense.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!loading) onClose()
      }}
      title="Delete Expense"
      maxWidth="md"
      footer={
        <div className="flex w-full justify-end gap-3">
          <Button
            variant="secondary"
            disabled={loading}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={loading}
            onClick={handleDelete}
          >
            Delete Expense
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-sm text-slate-600">
        {/* Expense Detail Summary */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-slate-900 text-base">
                {expense.description || 'Untitled Expense'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {expense.projects?.name ? `Project: ${expense.projects.name}` : 'General / Firm-level'} • Date: {formatDate(expense.date)}
              </p>
            </div>
            <span className="text-base font-bold text-slate-900 tabular-nums">
              {formatINR(expense.amount)}
            </span>
          </div>
          <div className="text-xs text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
            <span>Category: <strong className="text-slate-700 uppercase tracking-wide">{expense.category}</strong></span>
          </div>
        </div>

        {/* Primary Confirmation Notice */}
        <p className="text-slate-700 font-medium">
          Delete this expense? This cannot be undone.
        </p>

        {/* Linked Supplier Transaction Notice */}
        {checkingLink ? (
          <div className="p-3 rounded-lg bg-slate-100 text-xs text-slate-500 flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Checking for linked supplier transactions...
          </div>
        ) : linkedSupplierTx ? (
          <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 space-y-2">
            <div className="flex items-start gap-2">
              <svg className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="text-xs space-y-1">
                <p className="font-semibold text-amber-950">
                  Linked Supplier Transaction Detected
                </p>
                <p className="text-amber-800">
                  This expense is linked to a procurement record for <strong>{linkedSupplierTx.supplierName}</strong> ({formatINR(linkedSupplierTx.amount)}).
                </p>
                <p className="text-amber-800/90">
                  Deleting this expense will unlink the receipt, but the supplier ledger entry will remain intact unless deleted below.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2.5 pt-2 border-t border-amber-200 cursor-pointer text-xs font-medium text-amber-950 select-none">
              <input
                type="checkbox"
                checked={deleteSupplierTxToo}
                onChange={e => setDeleteSupplierTxToo(e.target.checked)}
                className="h-4 w-4 rounded border-amber-300 text-rose-600 focus:ring-rose-500"
              />
              <span>Also delete the linked supplier ledger transaction ({formatINR(linkedSupplierTx.amount)})</span>
            </label>
          </div>
        ) : null}

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {error}
          </div>
        )}
      </div>
    </Modal>
  )
}
