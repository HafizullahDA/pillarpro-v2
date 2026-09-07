'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { PrintPreviewModal } from '@/components/pdf/PrintPreviewModal'
import { SupplierStatementPDF } from '@/components/pdf/SupplierStatementPDF'

interface SupplierStatementButtonProps {
  supplier: {
    id: string
    name: string
    contact_number?: string | null
    gst_number?: string | null
    address?: string | null
    notes?: string | null
    created_at: string
  }
  transactions: any[]
  totals: {
    totalProcured: number
    totalPaid: number
    balanceOwed: number
  }
}

export function SupplierStatementButton({
  supplier,
  transactions,
  totals,
}: SupplierStatementButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-xs"
      >
        <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
          />
        </svg>
        Download Statement (PDF)
      </Button>

      <PrintPreviewModal
        open={open}
        onClose={() => setOpen(false)}
        title={`Account Statement — ${supplier.name}`}
        subtitle={`Supplier Ledger & Transaction History`}
      >
        <SupplierStatementPDF
          supplier={supplier}
          transactions={transactions}
          totals={totals}
        />
      </PrintPreviewModal>
    </>
  )
}
