'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FieldWrapper, Input, Select, CurrencyInput, Textarea } from '@/components/ui/FormField'
import { useToast } from '@/components/ui/Toast'
import { formatINR } from '@/lib/format'
import { getTodayIST } from '@/lib/date'
import { findBestProjectMatch } from '@/lib/fuzzyMatch'
import { calculateCumulativeThisBill, calculateRABillNetPayable, calculateStatutoryDeductions } from '@/lib/calculations/raBill'
import { safeMul, safeSub } from '@/lib/calculations/financial'
import { ProjectOption, RABillOption } from '@/app/(app)/ra-bills/RABillActions'

export interface ScannedRABillData {
  bill_number?: string | null
  project_name?: string | null
  agency_name?: string | null
  submission_date?: string | null
  suggested_billing_mode?: 'cumulative' | 'standalone' | null
  work_certified_amount?: number | null
  retention_percentage?: number | null
  retention_amount?: number | null
  tds_amount?: number | null
  gst_tds_amount?: number | null
  labour_cess_amount?: number | null
  other_deductions_amount?: number | null
  net_payable_amount?: number | null
  previous_certified_amount?: number | null
  remarks?: string | null
}

interface RABillScanConfirmModalProps {
  open: boolean
  onClose: () => void
  scannedData: ScannedRABillData | null
  scanPreviewUrl?: string | null
  rawFile?: File | null
  projects: ProjectOption[]
  raBills: RABillOption[]
  defaultProjectId?: string
  onSuccess: () => void
}

export function RABillScanConfirmModal({
  open,
  onClose,
  scannedData,
  scanPreviewUrl,
  rawFile,
  projects,
  raBills,
  defaultProjectId,
  onSuccess,
}: RABillScanConfirmModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const toast = useToast()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form states
  const [billingMode, setBillingMode] = useState<'standalone' | 'cumulative'>('standalone')
  const [projectId, setProjectId] = useState(defaultProjectId || '')
  const [billNumber, setBillNumber] = useState('')
  const [submissionDate, setSubmissionDate] = useState(getTodayIST())
  const [workCertifiedAmount, setWorkCertifiedAmount] = useState('')
  const [retentionPercentage, setRetentionPercentage] = useState('5.00')
  const [previousBillId, setPreviousBillId] = useState('')
  const [remarks, setRemarks] = useState('')

  // Pre-fill form whenever scannedData changes
  useEffect(() => {
    if (!scannedData) return

    // 1. Determine best project match
    let matchedProjectId = defaultProjectId || ''
    if (!matchedProjectId && (scannedData.project_name || scannedData.agency_name)) {
      const searchTarget = `${scannedData.project_name || ''} ${scannedData.agency_name || ''}`.trim()
      const match = findBestProjectMatch(searchTarget, projects)
      if (match.bestMatch) {
        matchedProjectId = match.bestMatch.id
      }
    }
    if (!matchedProjectId && projects.length === 1) {
      matchedProjectId = projects[0].id
    }
    setProjectId(matchedProjectId)

    // 2. Determine billing mode
    const mode = scannedData.suggested_billing_mode === 'cumulative' ? 'cumulative' : 'standalone'
    setBillingMode(mode)

    // 3. Populate fields
    setBillNumber(scannedData.bill_number || '')
    setSubmissionDate(scannedData.submission_date || getTodayIST())
    setWorkCertifiedAmount(
      scannedData.work_certified_amount != null ? String(scannedData.work_certified_amount) : ''
    )
    setRetentionPercentage(
      scannedData.retention_percentage != null ? String(scannedData.retention_percentage) : '5.00'
    )
    setRemarks(scannedData.remarks || '')

    // 4. Auto-detect prior bill in sequence if cumulative
    if (matchedProjectId) {
      const projectBills = raBills.filter(b => b.project_id === matchedProjectId)
      if (projectBills.length > 0) {
        setPreviousBillId(projectBills[0].id)
      }
    }
  }, [scannedData, defaultProjectId, projects, raBills])

  // Calculations
  const isCumulative = billingMode === 'cumulative'
  const prevBill = raBills.find(b => b.id === previousBillId)
  const prevCertified = prevBill
    ? (Number(prevBill.cumulative_certified_amount) || Number(prevBill.work_certified_amount) || 0)
    : 0
  const prevReceived = prevBill ? (Number(prevBill.amount_received) || 0) : 0

  const certifiedNum = parseFloat(workCertifiedAmount) || 0
  const retentionPctNum = parseFloat(retentionPercentage) || 0

  // Pure financial math derivations
  const standaloneRetention = safeMul(certifiedNum, retentionPctNum / 100)
  const standaloneNetPayable = calculateRABillNetPayable({
    workCertified: certifiedNum,
    totalDeductions: standaloneRetention,
  })

  // Cumulative calculations
  const cumulativeThisBillCertified = calculateCumulativeThisBill({
    currentCumulative: certifiedNum,
    previousCumulative: prevCertified,
  })
  const cumulativeRetention = safeMul(certifiedNum, retentionPctNum / 100)
  const cumulativeNetPassed = calculateRABillNetPayable({
    workCertified: certifiedNum,
    totalDeductions: cumulativeRetention,
  })
  const cumulativeNetPayableThisBill = Math.max(0, safeSub(cumulativeNetPassed, prevReceived))

  const liveRetentionAmount = isCumulative ? cumulativeRetention : standaloneRetention
  const liveNetPayable = isCumulative ? cumulativeNetPayableThisBill : standaloneNetPayable
  const thisBillCertified = isCumulative ? cumulativeThisBillCertified : certifiedNum

  // Estimated statutory deductions (2% IT-TDS, 2% GST-TDS, 1% Labour Cess)
  const estimatedTreasuryBase = isCumulative ? cumulativeNetPassed : certifiedNum
  const estimatedTreasury = calculateStatutoryDeductions(estimatedTreasuryBase, { retentionPercent: 0 })

  const uploadScannedDocument = async (file: File): Promise<string | null> => {
    try {
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filePath = `ra_bills/${Date.now()}_${cleanName}`
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, { cacheControl: '3600', upsert: true })

      if (uploadError) {
        console.warn('Storage upload error for scanned bill:', uploadError.message)
        return null
      }

      const { data } = supabase.storage.from('documents').getPublicUrl(filePath)
      return data.publicUrl || null
    } catch (err) {
      console.warn('Storage upload exception:', err)
      return null
    }
  }

  const handleSave = async () => {
    if (saving) return

    if (!projectId) {
      setError('Please select a target Project (Government Site).')
      return
    }

    if (!billNumber.trim()) {
      setError('Bill Number / Reference is required.')
      return
    }

    if (certifiedNum <= 0) {
      setError('Work Certified Amount must be greater than zero.')
      return
    }

    if (isCumulative && prevCertified > 0 && certifiedNum < prevCertified) {
      setError(
        `Cumulative certified amount (${formatINR(certifiedNum)}) cannot be less than previous bill's certified amount (${formatINR(prevCertified)}).`
      )
      return
    }

    setSaving(true)
    setError('')

    try {
      let documentUrl: string | null = null
      if (rawFile) {
        documentUrl = await uploadScannedDocument(rawFile)
      }

      const { error: insertErr } = await supabase.from('ra_bills').insert({
        project_id: projectId,
        bill_number: billNumber.trim(),
        submission_date: submissionDate || getTodayIST(),
        billing_mode: billingMode,
        previous_bill_id: isCumulative && previousBillId ? previousBillId : null,
        cumulative_certified_amount: isCumulative ? certifiedNum : null,
        previous_certified_amount: isCumulative ? prevCertified : 0,
        previous_received_amount: isCumulative ? prevReceived : 0,
        this_bill_work_certified: isCumulative ? thisBillCertified : certifiedNum,
        net_payable_this_bill: liveNetPayable,
        work_certified_amount: certifiedNum,
        retention_percentage: retentionPctNum,
        amount_received: 0,
        status: 'submitted',
        document_url: documentUrl,
        remarks: remarks.trim() || null,
      })

      if (insertErr) {
        setError(insertErr.message || 'Failed to save RA bill.')
        setSaving(false)
        return
      }

      setSaving(false)
      toast.success(`Scanned RA Bill "${billNumber.trim()}" submitted successfully`)
      onSuccess()
      onClose()
      router.refresh()
    } catch (err: any) {
      setSaving(false)
      setError(err.message || 'An unexpected error occurred.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title="Verify Scanned Government RA Bill"
      maxWidth="xl"
      footer={
        <div className="flex w-full justify-between items-center gap-3">
          <Button variant="secondary" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={handleSave}>
            Confirm & Save RA Bill
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Banner with AI confidence & document preview */}
        <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-xs font-semibold text-blue-900">
              Scanned with Gemini AI • Review extracted values & choose Billing Mode
              Digitized by PillarVision™ Intelligence • Review extracted values & choose Billing Mode
            </span>
          </div>
          {scanPreviewUrl && (
            <a
              href={scanPreviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline shrink-0 flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View Document
            </a>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        {/* ── Prominent Billing Mode Selector ────────────────────── */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
            Choose Billing Mode *
          </label>
          <div className="grid grid-cols-2 p-1 bg-slate-200/70 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setBillingMode('standalone')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                billingMode === 'standalone'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Standalone (Per Bill)
            </button>
            <button
              type="button"
              onClick={() => setBillingMode('cumulative')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                billingMode === 'cumulative'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cumulative (To Date)
            </button>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed px-1">
            {isCumulative
              ? '📌 Cumulative: Certified amount reflects Measurement Book (MB) total from inception up to this bill. Previous certified amounts will be deducted.'
              : '📌 Standalone: Certified amount reflects only the net-new work certified during this specific billing cycle.'}
          </p>
        </div>

        {/* ── Project and Bill Identity ──────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldWrapper label="Project (Government Site)" required>
            <Select
              value={projectId}
              onChange={e => {
                const newId = e.target.value
                setProjectId(newId)
                if (isCumulative) {
                  const pBills = raBills.filter(b => b.project_id === newId)
                  setPreviousBillId(pBills.length > 0 ? pBills[0].id : '')
                }
              }}
            >
              <option value="">Select Project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.agency_name ? `(${p.agency_name})` : ''}
                </option>
              ))}
            </Select>
          </FieldWrapper>

          <FieldWrapper label="Bill Number / Reference" required hint="e.g. RA-01, CC-02">
            <Input
              value={billNumber}
              onChange={e => setBillNumber(e.target.value)}
              placeholder="e.g. RA Bill 01"
            />
          </FieldWrapper>
        </div>

        {/* Previous bill selector if cumulative */}
        {isCumulative && (
          <FieldWrapper
            label="Previous Cumulative Bill in Sequence"
            hint="Prior bill used to deduct previous certified work and payments"
          >
            <Select
              value={previousBillId}
              onChange={e => setPreviousBillId(e.target.value)}
            >
              <option value="">— No Previous Bill (First Cumulative Bill) —</option>
              {raBills
                .filter(b => b.project_id === projectId)
                .map(b => (
                  <option key={b.id} value={b.id}>
                    {b.bill_number} (Certified: {formatINR(b.cumulative_certified_amount || b.work_certified_amount)})
                  </option>
                ))}
            </Select>
          </FieldWrapper>
        )}

        {/* ── Financial Figures ──────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <FieldWrapper
              label={isCumulative ? 'Cumulative Work Certified (₹)' : 'Work Certified Amount (₹)'}
              required
              hint={isCumulative ? 'Total work certified up-to-date in MB' : 'Gross certified before deductions'}
            >
              <CurrencyInput
                value={workCertifiedAmount}
                onChange={e => setWorkCertifiedAmount(e.target.value)}
                placeholder="0.00"
              />
            </FieldWrapper>
          </div>

          <FieldWrapper label="Submission Date" required>
            <Input
              type="date"
              value={submissionDate}
              onChange={e => setSubmissionDate(e.target.value)}
            />
          </FieldWrapper>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldWrapper label="Retention Deducted (%)" required hint="Typically 5% on civil contracts">
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={retentionPercentage}
              onChange={e => setRetentionPercentage(e.target.value)}
              placeholder="5.00"
            />
          </FieldWrapper>

          <FieldWrapper label="Remarks / Contractor Notes" hint="Optional">
            <Input
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="e.g. Earthwork & culvert package"
            />
          </FieldWrapper>
        </div>

        {/* ── Financial Summary Breakdown Card ────────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
            Calculated Net Payable & Statutory Deductions
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-white border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Work This Bill</span>
              <span className="font-bold text-slate-900 mt-0.5 block">
                {formatINR(thisBillCertified)}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-white border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Retention ({retentionPctNum}%)</span>
              <span className="font-bold text-amber-700 mt-0.5 block">
                {formatINR(liveRetentionAmount)}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-white border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Treasury Deductions</span>
              <span className="font-bold text-rose-700 mt-0.5 block">
                {formatINR(estimatedTreasury.totalDeductions)}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-emerald-50/80 border border-emerald-200">
              <span className="text-emerald-800 block text-[11px] font-semibold">Net Liquid Inflow</span>
              <span className="font-bold text-emerald-900 mt-0.5 block">
                {formatINR(Math.max(0, liveNetPayable - estimatedTreasury.totalDeductions))}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

