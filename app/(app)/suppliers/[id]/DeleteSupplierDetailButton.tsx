'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { canDeleteSupplier } from '@/lib/permissions'
import { DeleteSupplierModal } from '../DeleteSupplierModal'
import { SupplierSummaryRow } from '../SuppliersClient'

interface DeleteSupplierDetailButtonProps {
  supplier: {
    id: string
    name: string
    contact_number?: string | null
    gst_number?: string | null
    address?: string | null
    total_procured?: number
    total_paid?: number
    outstanding_balance?: number
  }
  userRole?: string
}

export function DeleteSupplierDetailButton({
  supplier,
  userRole,
}: DeleteSupplierDetailButtonProps) {
  const router = useRouter()
  const toast = useToast()
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  const canDelete = canDeleteSupplier(userRole)
  if (!canDelete) return null

  const supplierRow: SupplierSummaryRow = {
    id: supplier.id,
    name: supplier.name,
    contact_number: supplier.contact_number ?? null,
    gst_number: supplier.gst_number ?? null,
    address: supplier.address ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    total_procured: supplier.total_procured ?? 0,
    total_paid: supplier.total_paid ?? 0,
    outstanding_balance: supplier.outstanding_balance ?? 0,
  }

  const handleDeleteSuccess = () => {
    toast.success(`Supplier "${supplier.name}" deleted successfully`)
    router.push('/suppliers')
    router.refresh()
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setDeleteModalOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300"
        title="Delete Supplier (Owner only)"
      >
        <svg className="w-3.5 h-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span>Delete Supplier</span>
      </Button>

      <DeleteSupplierModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        supplier={supplierRow}
        onSuccess={handleDeleteSuccess}
      />
    </>
  )
}

