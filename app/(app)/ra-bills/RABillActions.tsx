'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { FEATURES } from '@/lib/features'
import { compressImage } from '@/lib/imageCompress'
import { NewRABillDrawer } from '@/components/ra-bills/NewRABillDrawer'
import { RecordPaymentDrawer } from '@/components/ra-bills/RecordPaymentDrawer'
import { SecurityDepositDrawer } from '@/components/ra-bills/SecurityDepositDrawer'
import { RABillScanConfirmModal, ScannedRABillData } from '@/components/ra-bills/RABillScanConfirmModal'
import { UpgradeModal } from '@/components/subscription/UpgradeModal'
import { isSubscriptionActive, SubscriptionOrgData } from '@/lib/subscription'

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
  bill_type?: 'running' | 'first_and_final' | 'final'
  mb_number?: string | null
  mb_page_start?: number | null
  mb_page_end?: number | null
  measurement_date?: string | null
  measuring_officer_name?: string | null
  measuring_officer_designation?: string | null
  advance_payments_unmeasured?: number
  cement_recovery?: number
  steel_recovery?: number
  other_material_recovery?: number
  actual_completion_date?: string | null
  dlp_months?: number
  projects?: { name: string } | null
}

export interface RABillActionsProps {
  projects: ProjectOption[]
  raBills?: RABillOption[]
  defaultProjectId?: string
  preselectedBillId?: string
  onPaymentSuccess?: () => void
  onClosePayment?: () => void
  org?: SubscriptionOrgData
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
  org,
}: RABillActionsProps) {
  const toast = useToast()
  const [activeDrawer, setActiveDrawer] = useState<'submit_ra' | 'record_payment' | 'add_deposit' | null>(null)
  const [currentBillId, setCurrentBillId] = useState<string | undefined>(preselectedBillId)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [upgradeContent, setUpgradeContent] = useState<{ title: string; description: string }>({
    title: 'Subscription Required',
    description: '',
  })

  // AI Scan states
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [scanning, setScanning] = useState(false)
  const [scanModalOpen, setScanModalOpen] = useState(false)
  const [scannedBillData, setScannedBillData] = useState<ScannedRABillData | null>(null)
  const [scanPreviewUrl, setScanPreviewUrl] = useState<string | null>(null)
  const [rawScanFile, setRawScanFile] = useState<File | null>(null)

  const isOrgActive = !org || isSubscriptionActive(org)

  const triggerScan = (type: 'camera' | 'file') => {
    if (!isOrgActive) {
      setUpgradeContent({
        title: 'Subscription Required for AI RA Bill Scanner',
        description:
          'Your workspace is currently in Read-Only mode. Please reactivate your subscription to use the Gemini AI OCR Scanner on physical bills and measurement books.',
      })
      setUpgradeModalOpen(true)
      return
    }

    if (type === 'camera') {
      cameraInputRef.current?.click()
    } else {
      fileInputRef.current?.click()
    }
  }

  const handleOpenSubmit = () => {
    if (!isOrgActive) {
      setUpgradeContent({
        title: 'Subscription Required to Submit RA Bills',
        description:
          'Your workspace is currently in Read-Only mode. Existing bills and certificates remain viewable and printable. Please reactivate your subscription to create and submit new Running Account bills.',
      })
      setUpgradeModalOpen(true)
      return
    }
    setActiveDrawer('submit_ra')
  }

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

  const handleScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setScanning(true)

    try {
      let base64Str = ''
      if (file.type.startsWith('image/')) {
        base64Str = await compressImage(file, 2000, 0.85)
      } else {
        // PDF document
        base64Str = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(new Error('Failed to read document file.'))
          reader.readAsDataURL(file)
        })
      }

      setScanPreviewUrl(base64Str)
      setRawScanFile(file)

      const res = await fetch('/api/scan-ra-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Str }),
      })

      const json = await res.json()
      setScanning(false)

      if (!res.ok || json.error) {
        toast.error(json.error || 'Failed to scan and analyze RA Bill.')
        return
      }

      setScannedBillData(json.data)
      setScanModalOpen(true)
      toast.success('RA Bill analyzed with Gemini 3.6 Flash! Please review.')
      toast.success('RA Bill analyzed by PillarVision™ Intelligence! Please review.')
    } catch (err: any) {
      setScanning(false)
      toast.error(err.message || 'Failed to scan RA Bill.')
    } finally {
      if (cameraInputRef.current) cameraInputRef.current.value = ''
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <>
      {/* Hidden File / Camera Inputs */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleScanFile}
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*,application/pdf"
        onChange={handleScanFile}
        className="hidden"
      />

      <div className="flex flex-wrap items-center gap-2">
        {/* Direct AI Scan RA Bill Button */}
        <div className="inline-flex items-center rounded-xl bg-blue-50 border border-blue-200 p-0.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={scanning}
            onClick={() => triggerScan('camera')}
            className="bg-transparent border-0 text-blue-700 hover:bg-white text-xs h-8 px-2.5 shadow-none flex items-center gap-1.5"
            title="Scan RA bill with phone camera"
          >
            <svg className="w-3.5 h-3.5 text-blue-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Scan RA Bill</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={scanning}
            onClick={() => triggerScan('file')}
            className="bg-transparent border-0 text-blue-700 hover:bg-white text-xs h-8 px-2 shadow-none"
            title="Upload RA bill photo or PDF document"
          >
            <svg className="w-3.5 h-3.5 text-blue-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </Button>
        </div>

        <Button size="sm" onClick={handleOpenSubmit}>
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
        onTriggerScan={() => triggerScan('file')}
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

      {/* 4. AI Scanned RA Bill Confirmation Modal */}
      <RABillScanConfirmModal
        open={scanModalOpen}
        onClose={() => setScanModalOpen(false)}
        scannedData={scannedBillData}
        scanPreviewUrl={scanPreviewUrl}
        rawFile={rawScanFile}
        projects={projects}
        raBills={raBills}
        defaultProjectId={defaultProjectId}
        onSuccess={() => {
          setScanModalOpen(false)
          if (onPaymentSuccess) onPaymentSuccess()
        }}
      />

      {/* 5. Subscription Upgrade Modal */}
      <UpgradeModal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        title={upgradeContent.title}
        description={upgradeContent.description}
        requiredPlan="growth"
        currentPlan={(org?.plan_tier as any) || 'bootstrap'}
      />
    </>
  )
}
