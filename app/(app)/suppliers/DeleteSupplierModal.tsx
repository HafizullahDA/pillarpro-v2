'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { formatINR } from '@/lib/format'
import { SupplierSummaryRow } from './SuppliersClient'

interface DeleteSupplierModalProps {
  open: boolean
  onClose: () => void
  supplier: SupplierSummaryRow | null
  onSuccess: () => void
}

export function DeleteSupplierModal({
  open,
  onClose,
  supplier,
  onSuccess,
}: DeleteSupplierModalProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!supplier) return null

  const hasTransactions =
    (Number(supplier.total_procured) || 0) > 0 ||
    (Number(supplier.total_paid) || 0) > 0

  const handleDelete = async () => {
    setLoading(true)
    setError('')

    try {
      // 1. Try atomic delete_supplier RPC (enforces owner validation & cleans transactions/ledger)
      const { error: rpcError } = await supabase.rpc('delete_supplier', {
        p_supplier_id: supplier.id,
      })

      if (rpcError) {
        // If RPC function hasn't been created yet, attempt direct delete
        if (rpcError.code === 'PGRST202' || rpcError.message?.includes('function public.delete_supplier')) {
          const { error: directError } = await supabase
            .from('suppliers')
            .delete()
            .eq('id', supplier.id)

          if (directError) {
            setError(directError.message)
            setLoading(false)
            return
          }
        } else {
          setError(rpcError.message || 'Failed to delete supplier.')
          setLoading(false)
          return
        }
      }

      setLoading(false)
      onSuccess()
      onClose()
    } catch (err: any) {
      setLoading(false)
      setError(err.message || 'Failed to delete supplier.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!loading) {
          setError('')
          onClose()
        }
      }}
      title="Delete Supplier Account"
      maxWidth="md"
      footer={
        <div className="flex w-full justify-end gap-3">
          <Button
            variant="secondary"
            disabled={loading}
            onClick={() => {
              setError('')
              onClose()
            }}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={loading}
            onClick={handleDelete}
          >
            Delete Supplier
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-sm text-slate-600">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
          <div className="font-semibold text-slate-900 text-base">
            {supplier.name}
          </div>
          {supplier.address && (
            <div className="text-xs text-slate-500">{supplier.address}</div>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
            {supplier.gst_number && (
              <div>
                GSTIN: <span className="font-mono text-slate-700">{supplier.gst_number}</span>
              </div>
            )}
            {supplier.contact_number && (
              <div>
                Contact: <span className="text-slate-700">{supplier.contact_number}</span>
              </div>
            )}
          </div>
        </div>

        {hasTransactions ? (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 space-y-2">
            <div className="flex items-center gap-2 font-medium text-rose-900">
              <svg className="w-5 h-5 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Warning: Active Transaction History</span>
            </div>
            <p className="text-xs text-rose-700 leading-relaxed">
              This supplier has recorded transactions totaling{' '}
              <strong>{formatINR(supplier.total_procured)}</strong> procured and{' '}
              <strong>{formatINR(supplier.total_paid)}</strong> paid (Outstanding Balance:{' '}
              <strong>{formatINR(supplier.outstanding_balance)}</strong>).
            </p>
            <p className="text-xs text-rose-700 leading-relaxed font-semibold">
              Deleting this supplier will permanently purge the supplier account and all associated site procurements, payments, and central ledger records.
            </p>
          </div>
        ) : (
          <p className="text-slate-600">
            Are you sure you want to delete this supplier? This action cannot be undone.
          </p>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}
      </div>
    </Modal>
  )
}

