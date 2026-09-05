'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { FieldWrapper, Input, Select, CurrencyInput, Textarea } from '@/components/ui/FormField'
import { formatINR } from '@/lib/format'

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
  outstanding_balance: number
  projects?: { name: string } | null
}

const DEPOSIT_TYPES = [
  { value: 'performance_bank_guarantee',      label: 'Performance Bank Guarantee (PBG)' },
  { value: 'security_deposit',                label: 'Security Deposit (SD)' },
  { value: 'earnest_money_deposit',           label: 'Earnest Money Deposit (EMD)' },
  { value: 'additional_performance_security', label: 'Additional Performance Security (APS)' },
]

interface RABillActionsProps {
  projects: ProjectOption[]
  raBills?: RABillOption[]
  defaultProjectId?: string
  preselectedBillId?: string
  onPaymentSuccess?: () => void
}

export function RABillActions({
  projects,
  raBills = [],
  defaultProjectId,
  preselectedBillId,
}: RABillActionsProps) {
  const router = useRouter()
  const supabase = createClient()

  const [which, setWhich] = useState<'submit_ra' | 'record_payment' | 'add_deposit' | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // 1. Submit RA Bill Form
  const [billForm, setBillForm] = useState({
    project_id: defaultProjectId || '',
    bill_number: '',
    submission_date: new Date().toISOString().split('T')[0],
    work_certified_amount: '',
    retention_percentage: '5.00', // Default 5%, fully editable
    remarks: '',
  })

  // 2. Record Payment Form
  const [payForm, setPayForm] = useState({
    bill_id: preselectedBillId || '',
    amount_received: '',
    date_received: new Date().toISOString().split('T')[0],
    reference: '',
    remarks: '',
  })

  // 3. Add Security Deposit / BG Form
  const [depositForm, setDepositForm] = useState({
    project_id: defaultProjectId || '',
    deposit_type: 'performance_bank_guarantee',
    reference_number: '',
    issuing_bank: '',
    amount: '',
    issue_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    claim_expiry_date: '',
    notes: '',
  })

  // Helper to upload document to Supabase Storage
  const uploadDocument = async (file: File, bucket = 'documents'): Promise<string | null> => {
    try {
      setUploading(true)
      const fileExt = file.name.split('.').pop()
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filePath = `ra_bills/${Date.now()}_${cleanName}`

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { cacheControl: '3600', upsert: true })

      if (uploadError) {
        console.warn('Storage upload error (bucket might need public creation):', uploadError.message)
        // Fallback: if bucket doesn't exist yet, we don't block the bill record
        return null
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
      return data.publicUrl || null
    } catch (err) {
      console.warn('Document upload error:', err)
      return null
    } finally {
      setUploading(false)
    }
  }

  const openDrawer = (type: 'submit_ra' | 'record_payment' | 'add_deposit', billId?: string) => {
    setWhich(type)
    setError('')
    setSelectedFile(null)

    if (type === 'record_payment') {
      if (billId) {
        setPayForm(f => ({ ...f, bill_id: billId }))
      } else if (preselectedBillId) {
        setPayForm(f => ({ ...f, bill_id: preselectedBillId }))
      } else if (raBills.length === 1) {
        setPayForm(f => ({ ...f, bill_id: raBills[0].id }))
      }
    }
  }

  // Live calculation helpers for RA Bill submission
  const certifiedNum = parseFloat(billForm.work_certified_amount) || 0
  const retentionPctNum = parseFloat(billForm.retention_percentage) || 0
  const liveRetentionAmount = Math.round((certifiedNum * retentionPctNum) / 100 * 100) / 100
  const liveNetPayable = Math.max(0, certifiedNum - liveRetentionAmount)

  // 1. SAVE RA BILL
  const handleSaveRABill = async () => {
    if (!billForm.project_id) { setError('Please select a project.'); return }
    if (!billForm.bill_number.trim()) { setError('Bill number (e.g. RA Bill 01) is required.'); return }
    if (!billForm.work_certified_amount || certifiedNum <= 0) {
      setError('Please enter a valid work certified amount greater than 0.'); return
    }
    if (isNaN(retentionPctNum) || retentionPctNum < 0 || retentionPctNum > 100) {
      setError('Retention percentage must be between 0 and 100.'); return
    }

    setSaving(true)
    setError('')

    try {
      let documentUrl: string | null = null
      if (selectedFile) {
        documentUrl = await uploadDocument(selectedFile, 'documents')
      }

      const { error: err } = await supabase.from('ra_bills').insert({
        project_id: billForm.project_id,
        bill_number: billForm.bill_number.trim(),
        submission_date: billForm.submission_date || new Date().toISOString().split('T')[0],
        work_certified_amount: certifiedNum,
        retention_percentage: retentionPctNum,
        // retention_amount & net_payable_amount are GENERATED ALWAYS AS ... STORED
        amount_received: 0,
        status: 'submitted',
        document_url: documentUrl,
        remarks: billForm.remarks.trim() || null,
      })

      if (err) {
        if (err.message.includes('unique') || err.message.includes('bill_number')) {
          setError(`A bill with number "${billForm.bill_number.trim()}" already exists for this project.`)
        } else {
          setError(err.message)
        }
        setSaving(false)
        return
      }

      setSaving(false)
      setWhich(null)
      setBillForm({
        project_id: defaultProjectId || '',
        bill_number: '',
        submission_date: new Date().toISOString().split('T')[0],
        work_certified_amount: '',
        retention_percentage: '5.00',
        remarks: '',
      })
      setSelectedFile(null)
      router.refresh()
    } catch (err: any) {
      setSaving(false)
      setError(err.message || 'Failed to submit RA bill.')
    }
  }

  // 2. RECORD RA BILL PAYMENT
  const handleSavePayment = async () => {
    if (!payForm.bill_id) { setError('Please select an RA Bill.'); return }
    const paymentAmt = parseFloat(payForm.amount_received)
    if (isNaN(paymentAmt) || paymentAmt <= 0) {
      setError('Please enter a valid payment amount greater than 0.'); return
    }
    if (!payForm.date_received) { setError('Date received is required.'); return }

    setSaving(true)
    setError('')

    try {
      // Fetch current bill to increment amount_received
      const { data: currentBill, error: fetchErr } = await supabase
        .from('ra_bills')
        .select('amount_received, work_certified_amount')
        .eq('id', payForm.bill_id)
        .single()

      if (fetchErr || !currentBill) {
        setError('Could not locate the selected RA bill.')
        setSaving(false)
        return
      }

      const newTotalReceived = (Number(currentBill.amount_received) || 0) + paymentAmt

      // Update ra_bills: trigger trg_sync_ra_bill_status automatically syncs status & outstanding_balance
      const { error: updateErr } = await supabase
        .from('ra_bills')
        .update({
          amount_received: newTotalReceived,
          date_received: payForm.date_received,
          remarks: payForm.remarks.trim()
            ? `Payment: ${payForm.remarks.trim()}`
            : undefined,
        })
        .eq('id', payForm.bill_id)

      if (updateErr) {
        setError(updateErr.message)
        setSaving(false)
        return
      }

      setSaving(false)
      setWhich(null)
      setPayForm({
        bill_id: '',
        amount_received: '',
        date_received: new Date().toISOString().split('T')[0],
        reference: '',
        remarks: '',
      })
      router.refresh()
    } catch (err: any) {
      setSaving(false)
      setError(err.message || 'Failed to record payment.')
    }
  }

  // 3. SAVE SECURITY DEPOSIT / BANK GUARANTEE
  const handleSaveDeposit = async () => {
    if (!depositForm.project_id) { setError('Please select a project.'); return }
    if (!depositForm.reference_number.trim()) {
      setError('Reference number (BG Number / FDR Number) is required.'); return
    }
    const amt = parseFloat(depositForm.amount)
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid amount greater than 0.'); return
    }
    if (!depositForm.expiry_date) {
      setError('Expiry date is required for guarantee tracking.'); return
    }

    setSaving(true)
    setError('')

    try {
      let documentUrl: string | null = null
      if (selectedFile) {
        documentUrl = await uploadDocument(selectedFile, 'documents')
      }

      const { error: err } = await supabase.from('security_deposits').insert({
        project_id: depositForm.project_id,
        deposit_type: depositForm.deposit_type as any,
        reference_number: depositForm.reference_number.trim(),
        issuing_bank: depositForm.issuing_bank.trim() || null,
        amount: amt,
        issue_date: depositForm.issue_date || null,
        expiry_date: depositForm.expiry_date,
        claim_expiry_date: depositForm.claim_expiry_date || null,
        status: 'active',
        document_url: documentUrl,
        notes: depositForm.notes.trim() || null,
      })

      if (err) {
        setError(err.message)
        setSaving(false)
        return
      }

      setSaving(false)
      setWhich(null)
      setDepositForm({
        project_id: defaultProjectId || '',
        deposit_type: 'performance_bank_guarantee',
        reference_number: '',
        issuing_bank: '',
        amount: '',
        issue_date: new Date().toISOString().split('T')[0],
        expiry_date: '',
        claim_expiry_date: '',
        notes: '',
      })
      setSelectedFile(null)
      router.refresh()
    } catch (err: any) {
      setSaving(false)
      setError(err.message || 'Failed to record security deposit.')
    }
  }

  // Helper to find selected bill for payment drawer preview
  const activeBill = raBills.find(b => b.id === payForm.bill_id)

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => openDrawer('submit_ra')}>
          <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Submit RA Bill
        </Button>

        <Button size="sm" variant="secondary" onClick={() => openDrawer('record_payment')}>
          <svg className="h-4 w-4 mr-1.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Record Payment
        </Button>

        <Button size="sm" variant="secondary" onClick={() => openDrawer('add_deposit')}>
          <svg className="h-4 w-4 mr-1.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Add Security Deposit / BG
        </Button>
      </div>

      {/* ══════════════════════════════════════════
          1. SUBMIT RA BILL DRAWER
          ══════════════════════════════════════════ */}
      <Drawer
        open={which === 'submit_ra'}
        onClose={() => setWhich(null)}
        title="Submit Government RA Bill"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setWhich(null)}>
              Cancel
            </Button>
            <Button className="flex-1" loading={saving || uploading} onClick={handleSaveRABill}>
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
              onChange={e => setBillForm(f => ({ ...f, project_id: e.target.value }))}
            >
              <option value="">Select Project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.agency_name ? `(${p.agency_name})` : ''}
                </option>
              ))}
            </Select>
          </FieldWrapper>

          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="RA Bill Number" required hint="e.g. RA Bill 01">
              <Input
                placeholder="RA Bill 01"
                value={billForm.bill_number}
                onChange={e => setBillForm(f => ({ ...f, bill_number: e.target.value }))}
              />
            </FieldWrapper>

            <FieldWrapper label="Submission Date" required>
              <Input
                type="date"
                value={billForm.submission_date}
                onChange={e => setBillForm(f => ({ ...f, submission_date: e.target.value }))}
              />
            </FieldWrapper>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="Work Certified Amount (₹)" required hint="Approved by dept">
              <CurrencyInput
                placeholder="0"
                value={billForm.work_certified_amount}
                onChange={e => setBillForm(f => ({ ...f, work_certified_amount: e.target.value }))}
              />
            </FieldWrapper>

            <FieldWrapper label="Retention Held Back (%)" required hint="Typically 5% or 10%">
              <div className="relative">
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="5.0"
                  value={billForm.retention_percentage}
                  onChange={e => setBillForm(f => ({ ...f, retention_percentage: e.target.value }))}
                  className="pr-8"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-semibold">%</span>
              </div>
            </FieldWrapper>
          </div>

          {/* Live Calculation Preview Card */}
          {certifiedNum > 0 && (
            <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-3.5 space-y-1.5 text-xs">
              <div className="flex justify-between text-amber-900">
                <span>Retention Money Withheld ({retentionPctNum}%):</span>
                <strong className="font-bold tabular-nums">{formatINR(liveRetentionAmount)}</strong>
              </div>
              <div className="flex justify-between text-slate-700 font-medium pt-1 border-t border-amber-200/60">
                <span>Net Passed for Payment Now:</span>
                <strong className="font-bold text-slate-900 tabular-nums">{formatINR(liveNetPayable)}</strong>
              </div>
            </div>
          )}

          {/* Measurement Sheet Attachment */}
          <FieldWrapper label="Measurement Sheet / Certified Copy" hint="Upload PDF or bill copy to Supabase Storage">
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,image/*"
              onChange={e => setSelectedFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {selectedFile && (
              <p className="text-xs text-emerald-600 mt-1 font-medium">
                ✓ Ready to upload: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </FieldWrapper>

          <FieldWrapper label="Remarks / Measurement Book (MB) Ref">
            <Textarea
              placeholder="e.g. MB No. 412, Pages 12-25. Passed by Assistant Engineer..."
              value={billForm.remarks}
              onChange={e => setBillForm(f => ({ ...f, remarks: e.target.value }))}
            />
          </FieldWrapper>
        </div>
      </Drawer>

      {/* ══════════════════════════════════════════
          2. RECORD RA PAYMENT DRAWER
          ══════════════════════════════════════════ */}
      <Drawer
        open={which === 'record_payment'}
        onClose={() => setWhich(null)}
        title="Record RA Bill Payment"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setWhich(null)}>
              Cancel
            </Button>
            <Button className="flex-1" loading={saving} onClick={handleSavePayment}>
              Save Payment
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

          <FieldWrapper label="Select RA Bill" required>
            <Select
              value={payForm.bill_id}
              onChange={e => setPayForm(f => ({ ...f, bill_id: e.target.value }))}
            >
              <option value="">Select an RA Bill...</option>
              {raBills.map(b => {
                const netPayable = Number(b.net_payable_amount) || (Number(b.work_certified_amount) - (Number(b.retention_amount) || 0))
                const outstanding = Math.max(0, netPayable - (Number(b.amount_received) || 0))
                return (
                  <option key={b.id} value={b.id}>
                    {b.bill_number} — {b.projects?.name || 'Project'} (Bal: {formatINR(outstanding)})
                  </option>
                )
              })}
            </Select>
          </FieldWrapper>

          {activeBill && (() => {
            const netPayable = Number(activeBill.net_payable_amount) || (Number(activeBill.work_certified_amount) - (Number(activeBill.retention_amount) || 0))
            const retention = Number(activeBill.retention_amount) || (Number(activeBill.work_certified_amount) * (Number(activeBill.retention_percentage || 5) / 100))
            const outstanding = Math.max(0, netPayable - (Number(activeBill.amount_received) || 0))

            return (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Work Certified:</span>
                  <span className="font-semibold text-slate-800">{formatINR(activeBill.work_certified_amount)}</span>
                </div>
                <div className="flex justify-between text-amber-800">
                  <span>Retention Withheld:</span>
                  <span className="font-semibold">{formatINR(retention)}</span>
                </div>
                <div className="flex justify-between text-slate-700 font-medium pt-1 border-t border-slate-200">
                  <span>Net Passed for Payment:</span>
                  <span className="font-bold text-slate-900">{formatINR(netPayable)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Amount Received:</span>
                  <span className="font-semibold">{formatINR(activeBill.amount_received)}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1">
                  <span>Net Outstanding Balance:</span>
                  <span className="text-rose-600 tabular-nums">{formatINR(outstanding)}</span>
                </div>
              </div>
            )
          })()}

          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="Amount Received (₹)" required>
              <CurrencyInput
                placeholder="0"
                value={payForm.amount_received}
                onChange={e => setPayForm(f => ({ ...f, amount_received: e.target.value }))}
              />
            </FieldWrapper>

            <FieldWrapper label="Date Received" required>
              <Input
                type="date"
                value={payForm.date_received}
                onChange={e => setPayForm(f => ({ ...f, date_received: e.target.value }))}
              />
            </FieldWrapper>
          </div>

          <FieldWrapper label="Treasury Voucher / UTR / Cheque Ref">
            <Input
              placeholder="e.g. Treasury Voucher #8910 / SBI NEFT"
              value={payForm.reference}
              onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))}
            />
          </FieldWrapper>

          <FieldWrapper label="Notes">
            <Textarea
              placeholder="Statutory deductions (TDS, GST TDS, Cess) or remarks..."
              value={payForm.remarks}
              onChange={e => setPayForm(f => ({ ...f, remarks: e.target.value }))}
            />
          </FieldWrapper>
        </div>
      </Drawer>

      {/* ══════════════════════════════════════════
          3. ADD SECURITY DEPOSIT / BG DRAWER
          ══════════════════════════════════════════ */}
      <Drawer
        open={which === 'add_deposit'}
        onClose={() => setWhich(null)}
        title="Add Security Deposit / Bank Guarantee"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setWhich(null)}>
              Cancel
            </Button>
            <Button className="flex-1" loading={saving || uploading} onClick={handleSaveDeposit}>
              Save Guarantee
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

          <FieldWrapper label="Project" required>
            <Select
              value={depositForm.project_id}
              onChange={e => setDepositForm(f => ({ ...f, project_id: e.target.value }))}
            >
              <option value="">Select Project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </FieldWrapper>

          <FieldWrapper label="Deposit / Instrument Type" required>
            <Select
              value={depositForm.deposit_type}
              onChange={e => setDepositForm(f => ({ ...f, deposit_type: e.target.value }))}
            >
              {DEPOSIT_TYPES.map(t => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FieldWrapper>

          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="Reference / BG No." required hint="e.g. 0540124BG0001">
              <Input
                placeholder="BG / FDR No."
                value={depositForm.reference_number}
                onChange={e => setDepositForm(f => ({ ...f, reference_number: e.target.value }))}
              />
            </FieldWrapper>

            <FieldWrapper label="Issuing Bank">
              <Input
                placeholder="State Bank of India"
                value={depositForm.issuing_bank}
                onChange={e => setDepositForm(f => ({ ...f, issuing_bank: e.target.value }))}
              />
            </FieldWrapper>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="Amount (₹)" required>
              <CurrencyInput
                placeholder="0"
                value={depositForm.amount}
                onChange={e => setDepositForm(f => ({ ...f, amount: e.target.value }))}
              />
            </FieldWrapper>

            <FieldWrapper label="Issue Date">
              <Input
                type="date"
                value={depositForm.issue_date}
                onChange={e => setDepositForm(f => ({ ...f, issue_date: e.target.value }))}
              />
            </FieldWrapper>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="Expiry Date (Crucial)" required hint="Expiry of guarantee">
              <Input
                type="date"
                value={depositForm.expiry_date}
                onChange={e => setDepositForm(f => ({ ...f, expiry_date: e.target.value }))}
              />
            </FieldWrapper>

            <FieldWrapper label="Claim Expiry Date" hint="Department claim period">
              <Input
                type="date"
                value={depositForm.claim_expiry_date}
                onChange={e => setDepositForm(f => ({ ...f, claim_expiry_date: e.target.value }))}
              />
            </FieldWrapper>
          </div>

          <FieldWrapper label="Notes">
            <Textarea
              placeholder="FDR margin details, lien mark, extension requirements..."
              value={depositForm.notes}
              onChange={e => setDepositForm(f => ({ ...f, notes: e.target.value }))}
            />
          </FieldWrapper>
        </div>
      </Drawer>
    </>
  )
}

