'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { FEATURES } from '@/lib/features'
import { NewRABillDrawer } from '@/components/ra-bills/NewRABillDrawer'
import { RecordPaymentDrawer } from '@/components/ra-bills/RecordPaymentDrawer'
import { SecurityDepositDrawer } from '@/components/ra-bills/SecurityDepositDrawer'

export type ProjectOption = { id: string; name: string; agency_name?: string | null }
export type RABillOption = {
  id: string
  bill_number: string
  project_id: string
  work_certified_amount: number
  retention_percentage?: number
  retention_amount?: number
  net_payable_amount?: number
  amount_received: number
  tds_deducted?: number
  gst_tds_deducted?: number
  labour_cess_deducted?: number
  other_deductions?: number
  total_deductions?: number
  net_bank_received?: number
  billing_mode?: 'standalone' | 'cumulative'
  previous_bill_id?: string | null
  cumulative_certified_amount?: number | null
  previous_certified_amount?: number
  previous_received_amount?: number
  net_payable_this_bill?: number
  this_bill_work_certified?: number
  projects?: { name: string } | null
}

export interface RABillActionsProps {
  projects: ProjectOption[]
  raBills?: RABillOption[]
  defaultProjectId?: string
  preselectedBillId?: string
  onPaymentSuccess?: () => void
  onClosePayment?: () => void
}

/**
 * RABillActions — Modular Coordinator Component
 *
 * Provides primary action triggers and delegates drawer flows to dedicated,
 * schema-validated sub-components.
 */
export function RABillActions({
  projects,
  raBills = [],
  defaultProjectId,
  preselectedBillId,
  onPaymentSuccess,
  onClosePayment,
}: RABillActionsProps) {
  const [activeDrawer, setActiveDrawer] = useState<'submit_ra' | 'record_payment' | 'add_deposit' | null>(null)
  const [currentBillId, setCurrentBillId] = useState<string | undefined>(preselectedBillId)

  // Automatically open record payment drawer when a bill is clicked from table
  useEffect(() => {
    if (preselectedBillId) {
      setCurrentBillId(preselectedBillId)
      setActiveDrawer('record_payment')
    }
  }, [preselectedBillId])

  const handleClosePayment = useCallback(() => {
    setActiveDrawer(null)
    setCurrentBillId(undefined)
    if (onClosePayment) onClosePayment()
  }, [onClosePayment])

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setActiveDrawer('submit_ra')}>
          <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Submit RA Bill
        </Button>

        <Button size="sm" variant="secondary" onClick={() => setActiveDrawer('record_payment')}>
          <svg className="h-4 w-4 mr-1.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Record Payment
        </Button>

        {FEATURES.bankGuarantees && (
          <Button size="sm" variant="secondary" onClick={() => setActiveDrawer('add_deposit')}>
            <svg className="h-4 w-4 mr-1.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Add Security Deposit / BG
          </Button>
        )}
      </div>

      {/* 1. Modular New RA Bill Drawer */}
      <NewRABillDrawer
        open={activeDrawer === 'submit_ra'}
        onClose={() => setActiveDrawer(null)}
        projects={projects}
        raBills={raBills}
        defaultProjectId={defaultProjectId}
      />

      {/* 2. Modular Record Payment Drawer */}
      <RecordPaymentDrawer
        open={activeDrawer === 'record_payment'}
        onClose={handleClosePayment}
        raBills={raBills}
        preselectedBillId={currentBillId}
        onPaymentSuccess={onPaymentSuccess}
      />

      {/* 3. Modular Security Deposit / BG Drawer */}
      {FEATURES.bankGuarantees && (
        <SecurityDepositDrawer
          open={activeDrawer === 'add_deposit'}
          onClose={() => setActiveDrawer(null)}
          projects={projects}
          defaultProjectId={defaultProjectId}
        />
      )}
    </>
  )
}
