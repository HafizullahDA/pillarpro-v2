'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { useToast } from '@/components/ui/Toast'
import { FieldWrapper, Input, Select, CurrencyInput, Textarea } from '@/components/ui/FormField'
import { formatINR } from '@/lib/format'
import { getTodayIST } from '@/lib/date'
import { createRABillSchema } from '@/lib/validations/raBill'
import { translateError } from '@/lib/errorTranslator'
import { calculateCumulativeThisBill, calculateRABillNetPayable, calculateStatutoryDeductions } from '@/lib/calculations/raBill'
import { safeMul, safeSub } from '@/lib/calculations/financial'
import { ProjectOption, RABillOption } from '@/app/(app)/ra-bills/RABillActions'

interface NewRABillDrawerProps {
  open: boolean
  onClose: () => void
  projects: ProjectOption[]
  raBills: RABillOption[]
  defaultProjectId?: string
}

export function NewRABillDrawer({
  open,
  onClose,
  projects,
  raBills,
  defaultProjectId,
}: NewRABillDrawerProps) {
  const router = useRouter()
  const supabase = createClient()
  const toast = useToast()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const [billForm, setBillForm] = useState({
    project_id: defaultProjectId || '',
    bill_number: '',
    submission_date: getTodayIST(),
    billing_mode: 'standalone' as 'standalone' | 'cumulative',
    previous_bill_id: '',
    work_certified_amount: '',
    retention_percentage: '5.00',
    remarks: '',
  })

  // Calculations
  const isCumulative = billForm.billing_mode === 'cumulative'
  const prevBill = raBills.find(b => b.id === billForm.previous_bill_id)
  const prevCertified = prevBill
    ? (Number(prevBill.cumulative_certified_amount) || Number(prevBill.work_certified_amount) || 0)
    : 0
  const prevReceived = prevBill ? (Number(prevBill.amount_received) || 0) : 0

  const certifiedNum = parseFloat(billForm.work_certified_amount) || 0
  const retentionPctNum = parseFloat(billForm.retention_percentage) || 0

  // Pure financial math derivations
  const standaloneRetention = safeMul(certifiedNum, retentionPctNum / 100)
  const standaloneNetPayable = calculateRABillNetPayable({
    workCertified: certifiedNum,
    totalDeductions: standaloneRetention,
  })

  // Cumulative calculation
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

  // Estimated statutory treasury deductions (2% IT-TDS, 2% GST-TDS, 1% Labour Cess)
  const estimatedTreasuryBase = isCumulative ? cumulativeNetPassed : certifiedNum
  const estimatedTreasury = calculateStatutoryDeductions(estimatedTreasuryBase, { retentionPercent: 0 })

  const uploadDocument = async (file: File): Promise<string | null> => {
    try {
      setUploading(true)
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filePath = `ra_bills/${Date.now()}_${cleanName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, { cacheControl: '3600', upsert: true })

      if (uploadError) {
        console.warn('Storage upload error:', uploadError.message)
        return null
      }

      const { data } = supabase.storage.from('documents').getPublicUrl(filePath)
      return data.publicUrl || null
    } catch (err) {
      console.warn('Document upload error:', err)
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (saving || uploading) return

    // 1. Zod schema validation
    const validationResult = createRABillSchema.safeParse({
      project_id: billForm.project_id,
      bill_number: billForm.bill_number,
      submission_date: billForm.submission_date,
      billing_mode: billForm.billing_mode,
      previous_bill_id: billForm.previous_bill_id,
      work_certified_amount: billForm.work_certified_amount,
      retention_percentage: billForm.retention_percentage,
      remarks: billForm.remarks,
    })

    if (!validationResult.success) {
      setError(validationResult.error.issues[0]?.message || 'Please check the form inputs.')
      return
    }

    if (isCumulative && prevCertified > 0 && certifiedNum < prevCertified) {
      setError(
        `Cumulative certified amount (₹${certifiedNum.toLocaleString('en-IN')}) cannot be less than previous bill's certified amount (₹${prevCertified.toLocaleString('en-IN')}).`
      )
      return
    }

    setSaving(true)
    setError('')

    try {
      let documentUrl: string | null = null
      if (selectedFile) {
        documentUrl = await uploadDocument(selectedFile)
      }

      const { error: err } = await supabase.from('ra_bills').insert({
        project_id: billForm.project_id,
        bill_number: billForm.bill_number.trim(),
        submission_date: billForm.submission_date || getTodayIST(),
        billing_mode: billForm.billing_mode,
        previous_bill_id: isCumulative && billForm.previous_bill_id ? billForm.previous_bill_id : null,
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
        remarks: billForm.remarks.trim() || null,
      })

      if (err) {
        const { userMessage } = translateError(err)
        setError(userMessage)
        setSaving(false)
        return
      }

      const savedBillNumber = billForm.bill_number.trim()
      setSaving(false)
      onClose()
      setBillForm({
        project_id: defaultProjectId || '',
        bill_number: '',
        submission_date: getTodayIST(),
        billing_mode: 'standalone',
        previous_bill_id: '',
        work_certified_amount: '',
        retention_percentage: '5.00',
        remarks: '',
      })
      setSelectedFile(null)
      toast.success(`RA Bill "${savedBillNumber}" submitted successfully`)
      router.refresh()
    } catch (err: any) {
      setSaving(false)
      const { userMessage } = translateError(err, 'Failed to submit RA bill.')
      setError(userMessage)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Submit Government RA Bill"
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" loading={saving || uploading} onClick={handleSave}>
            {uploading ? 'Uploading Attachment...' : 'Submit RA Bill'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

        <FieldWrapper label="Project (Government Site)" required>
          <Select
            value={billForm.project_id}
            onChange={e => {
              const pId = e.target.value
              const pBills = raBills.filter(b => b.project_id === pId)
              setBillForm(f => ({
                ...f,
                project_id: pId,
                previous_bill_id: f.billing_mode === 'cumulative' && pBills.length > 0 ? pBills[0].id : '',
              }))
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

        {/* Billing Mode Segmented Toggle */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Billing Mode</label>
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setBillForm(f => ({ ...f, billing_mode: 'standalone' }))}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                billForm.billing_mode === 'standalone'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Standalone (Per Bill)
            </button>
            <button
              type="button"
              onClick={() => {
                const pBills = raBills.filter(b => b.project_id === billForm.project_id)
                setBillForm(f => ({
                  ...f,
                  billing_mode: 'cumulative',
                  previous_bill_id: f.previous_bill_id || (pBills.length > 0 ? pBills[0].id : ''),
                }))
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                billForm.billing_mode === 'cumulative'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Cumulative (To Date)
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {isCumulative
              ? 'Current bill reflects total work done from contract start to date (MB up-to-date total).'
              : 'Current bill reflects only net-new work certified during this specific billing cycle.'}
          </p>
        </div>

        {/* Previous Bill Selector for Cumulative Mode */}
        {isCumulative && (
          <FieldWrapper
            label="Previous Cumulative Bill in Sequence"
            hint="Prior bill to deduct previous certified/received amounts"
          >
            <Select
              value={billForm.previous_bill_id}
              onChange={e => setBillForm(f => ({ ...f, previous_bill_id: e.target.value }))}
            >
              <option value="">— No Previous Bill (First Cumulative Bill) —</option>
              {raBills
                .filter(b => b.project_id === billForm.project_id)
                .map(b => (
                  <option key={b.id} value={b.id}>
                    {b.bill_number} (Certified: {formatINR(b.cumulative_certified_amount || b.work_certified_amount)})
                  </option>
                ))}
            </Select>
          </FieldWrapper>
        )}

        <FieldWrapper label="Bill Number / Reference" required hint="e.g. RA-01, CC-02, or Final Bill">
          <Input
            value={billForm.bill_number}
            onChange={e => setBillForm(f => ({ ...f, bill_number: e.target.value }))}
            placeholder="e.g. RA Bill 01"
          />
        </FieldWrapper>

        <FieldWrapper label="Submission Date" required>
          <Input
            type="date"
            value={billForm.submission_date}
            onChange={e => setBillForm(f => ({ ...f, submission_date: e.target.value }))}
          />
        </FieldWrapper>

        {/* Amount Input */}
        <FieldWrapper
          label={isCumulative ? 'Cumulative Certified Work to Date (₹)' : 'Work Certified Amount (₹)'}
          required
          hint={
            isCumulative
              ? 'Total work certified from project start through this bill in Measurement Book'
              : 'Gross certified value before statutory deductions'
          }
        >
          <CurrencyInput
            value={billForm.work_certified_amount}
            onChange={e => setBillForm(f => ({ ...f, work_certified_amount: e.target.value }))}
            placeholder="0.00"
          />
        </FieldWrapper>

        {/* Retention Percentage & Breakdown */}
        <div className="grid grid-cols-2 gap-3">
          <FieldWrapper label="Retention Deducted (%)" required hint="Typically 5% on civil contracts">
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={billForm.retention_percentage}
              onChange={e => setBillForm(f => ({ ...f, retention_percentage: e.target.value }))}
              placeholder="5.00"
            />
          </FieldWrapper>

          <FieldWrapper label="Retention Amount" hint="Held by department">
            <div className="h-10 px-3 flex items-center rounded-lg bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700">
              {formatINR(liveRetentionAmount)}
            </div>
          </FieldWrapper>
        </div>

        {/* Cumulative Math Calculation Breakdown Card */}
        {isCumulative ? (
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 text-xs space-y-2">
            <div className="font-semibold text-blue-900 flex items-center justify-between border-b border-blue-100 pb-1.5">
              <span>Form 26 Cumulative Breakdown</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                CPWD Standard
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Total Work to Date (MB Cumulative):</span>
              <span className="font-semibold text-slate-800">{formatINR(certifiedNum)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Less Previous Certified Work:</span>
              <span className="font-semibold text-slate-800">- {formatINR(prevCertified)}</span>
            </div>
            <div className="flex justify-between text-blue-800 font-semibold pt-1 border-t border-blue-100/60">
              <span>Work Certified This Bill:</span>
              <span>{formatINR(thisBillCertified)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Less Retention on Total Work ({retentionPctNum}%):</span>
              <span className="font-semibold text-red-600">- {formatINR(liveRetentionAmount)}</span>
            </div>
            {prevReceived > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Less Prior Payments Received:</span>
                <span className="font-semibold text-slate-800">- {formatINR(prevReceived)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-1.5 border-t border-blue-200">
              <span>Net Payable This Bill:</span>
              <span className="text-blue-700">{formatINR(liveNetPayable)}</span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs space-y-2">
            <div className="flex justify-between items-center font-semibold text-slate-800 border-b border-slate-200 pb-1.5">
              <span>Form 26 Deduction Breakdown</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                PWD Standard
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Work Certified:</span>
              <span className="font-semibold text-slate-800">{formatINR(certifiedNum)}</span>
            </div>
            <div className="flex justify-between text-amber-700">
              <span>Less Retention Withheld ({retentionPctNum}%):</span>
              <span className="font-semibold">- {formatINR(standaloneRetention)}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
              <span>Net Payable (Passed for Payment):</span>
              <span className="text-blue-700">{formatINR(standaloneNetPayable)}</span>
            </div>
          </div>
        )}

        {/* Estimated Treasury Inflow Card */}
        {certifiedNum > 0 && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-emerald-900 font-semibold">
              <span className="flex items-center gap-1.5">
                <span>🏛️</span>
                <span>Estimated Treasury Realization</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                Form 26 Estimate
              </span>
            </div>
            <p className="text-[11px] text-emerald-800/80 leading-relaxed">
              Expected at treasury release: 2% TDS ({formatINR(estimatedTreasury.itTds)}) + 2% GST-TDS ({formatINR(estimatedTreasury.gstTds)}) + 1% Labour Cess ({formatINR(estimatedTreasury.labourCess)})
            </p>
            <div className="flex justify-between items-center pt-1 border-t border-emerald-200/60 font-semibold text-emerald-900">
              <span>Estimated Net Bank Credit:</span>
              <span className="text-sm font-bold text-emerald-700">
                {formatINR(Math.max(0, liveNetPayable - estimatedTreasury.totalDeductions))}
              </span>
            </div>
          </div>
        )}

        {/* Attachment Upload */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Bill Attachment / Measurement Book Copy (Optional)
          </label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={e => setSelectedFile(e.target.files?.[0] || null)}
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.zip"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/20"
          >
            {selectedFile ? (
              <div className="flex items-center justify-between text-xs text-slate-700">
                <span className="font-medium truncate max-w-[200px]">{selectedFile.name}</span>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    setSelectedFile(null)
                  }}
                  className="text-red-500 hover:text-red-700 font-bold ml-2"
                >
                  Remove
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Click to attach certified copy / MB scan (PDF or Image, max 10MB)
              </p>
            )}
          </div>
        </div>

        <FieldWrapper label="Remarks / Measurement Notes (Optional)">
          <Textarea
            value={billForm.remarks}
            onChange={e => setBillForm(f => ({ ...f, remarks: e.target.value }))}
            placeholder="e.g. Certified by Executive Engineer, Division II on MB Page 42"
            rows={2}
          />
        </FieldWrapper>
      </div>
    </Drawer>
  )
}

