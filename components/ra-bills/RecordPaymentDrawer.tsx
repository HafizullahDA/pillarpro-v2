'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { useToast } from '@/components/ui/Toast'
import { FieldWrapper, Input, Select, CurrencyInput, Textarea } from '@/components/ui/FormField'
import { formatINR } from '@/lib/format'
import { getTodayIST } from '@/lib/date'
import { recordPaymentSchema } from '@/lib/validations/raBill'
import { translateError } from '@/lib/errorTranslator'

export interface AdditionalDeductionItem {
  id: string
  label: string
  amount: string
}

interface RecordPaymentDrawerProps {
  open: boolean
  onClose: () => void
  raBills: any[]
  preselectedBillId?: string
  onPaymentSuccess?: () => void
}

export function RecordPaymentDrawer({
  open,
  onClose,
  raBills,
  preselectedBillId,
  onPaymentSuccess,
}: RecordPaymentDrawerProps) {
  const router = useRouter()
  const supabase = createClient()
  const toast = useToast()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [payForm, setPayForm] = useState({
    bill_id: preselectedBillId || '',
    gross_amount: '',
    tds_amount: '',
    gst_tds_amount: '',
    labour_cess_amount: '',
    other_deductions: '',
    date_received: getTodayIST(),
    reference: '',
    remarks: '',
  })

  const [additionalDeductions, setAdditionalDeductions] = useState<AdditionalDeductionItem[]>([])

  // Synchronize when preselectedBillId changes or drawer opens
  useEffect(() => {
    if (open) {
      const bId = preselectedBillId || (raBills.length === 1 ? raBills[0].id : '')
      const bObj = raBills.find(b => b.id === bId)
      let initialGross = ''
      if (bObj) {
        const netPayable =
          Number(bObj.net_payable_amount) ||
          Number(bObj.work_certified_amount) - (Number(bObj.retention_amount) || 0)
        const remaining = Math.max(0, netPayable - (Number(bObj.amount_received) || 0))
        initialGross = remaining > 0 ? String(remaining) : ''
      }
      setAdditionalDeductions([])
      setPayForm({
        bill_id: bId,
        gross_amount: initialGross,
        tds_amount: '',
        gst_tds_amount: '',
        labour_cess_amount: '',
        other_deductions: '',
        date_received: getTodayIST(),
        reference: '',
        remarks: '',
      })
      setError('')
    }
  }, [open, preselectedBillId, raBills])

  // Calculation helpers
  const activeBill = raBills.find(b => b.id === payForm.bill_id)
  const grossNum = parseFloat(payForm.gross_amount) || 0
  const tdsNum = parseFloat(payForm.tds_amount) || 0
  const gstTdsNum = parseFloat(payForm.gst_tds_amount) || 0
  const cessNum = parseFloat(payForm.labour_cess_amount) || 0

  const additionalDedsTotal = additionalDeductions.reduce(
    (sum, item) => sum + (parseFloat(item.amount) || 0),
    0
  )
  const totalDeductions = tdsNum + gstTdsNum + cessNum + additionalDedsTotal
  const netBankCredited = Math.max(0, grossNum - totalDeductions)

  const handleAddDeductionPreset = (label: string) => {
    setAdditionalDeductions(prev => [
      ...prev,
      { id: 'ded_' + Math.random().toString(36).substring(2, 9), label, amount: '' },
    ])
  }

  const handleUpdateDeduction = (id: string, field: 'label' | 'amount', val: string) => {
    setAdditionalDeductions(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: val } : item))
    )
  }

  const handleRemoveDeduction = (id: string) => {
    setAdditionalDeductions(prev => prev.filter(item => item.id !== id))
  }

  const handleSavePayment = async () => {
    if (saving) return

    // 1. Zod schema validation
    const validationResult = recordPaymentSchema.safeParse({
      bill_id: payForm.bill_id,
      gross_amount: payForm.gross_amount,
      tds_amount: payForm.tds_amount || 0,
      gst_tds_amount: payForm.gst_tds_amount || 0,
      labour_cess_amount: payForm.labour_cess_amount || 0,
      other_deductions: additionalDedsTotal,
      date_received: payForm.date_received,
      reference: payForm.reference,
      remarks: payForm.remarks,
      additional_deductions: additionalDeductions.map(d => ({
        label: d.label,
        amount: parseFloat(d.amount) || 0,
      })),
    })

    if (!validationResult.success) {
      setError(validationResult.error.issues[0]?.message || 'Please check the payment inputs.')
      return
    }

    if (totalDeductions > grossNum) {
      setError('Total deductions cannot exceed the gross amount released.')
      return
    }

    setSaving(true)
    setError('')

    try {
      if (!activeBill) {
        setError('Could not locate the selected RA bill.')
        setSaving(false)
        return
      }

      // Insert into ra_bill_payments ledger table
      const { data: paymentRecord, error: insertErr } = await supabase
        .from('ra_bill_payments')
        .insert({
          bill_id: payForm.bill_id,
          project_id: activeBill.project_id,
          payment_date: payForm.date_received,
          gross_amount: grossNum,
          tds_amount: tdsNum,
          gst_tds_amount: gstTdsNum,
          labour_cess_amount: cessNum,
          other_deductions: additionalDedsTotal,
          voucher_reference: payForm.reference.trim() || null,
          remarks: payForm.remarks.trim() || null,
        })
        .select('id')
        .single()

      if (insertErr) {
        const { userMessage } = translateError(insertErr)
        setError(userMessage)
        setSaving(false)
        return
      }

      // Insert itemized line items into public.bill_deductions
      const validItems = additionalDeductions
        .filter(d => (parseFloat(d.amount) || 0) > 0 && d.label.trim())
        .map(d => ({
          bill_id: payForm.bill_id,
          payment_id: paymentRecord?.id || null,
          deduction_label: d.label.trim(),
          deduction_amount: parseFloat(d.amount),
        }))

      if (validItems.length > 0) {
        const { error: dedErr } = await supabase.from('bill_deductions').insert(validItems)
        if (dedErr) {
          console.warn('Could not insert itemized deductions:', dedErr.message)
        }
      }

      setSaving(false)
      onClose()
      setAdditionalDeductions([])
      if (onPaymentSuccess) onPaymentSuccess()
      toast.success(`Payment of ₹${grossNum.toLocaleString('en-IN')} recorded`)
      router.refresh()
    } catch (err: any) {
      setSaving(false)
      const { userMessage } = translateError(err, 'Failed to record payment.')
      setError(userMessage)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Record RA Bill Payment"
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
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
            onChange={e => {
              const selectedId = e.target.value
              const targetBill = raBills.find(b => b.id === selectedId)
              let initialGross = ''
              if (targetBill) {
                const netPayable =
                  Number(targetBill.net_payable_amount) ||
                  Number(targetBill.work_certified_amount) - (Number(targetBill.retention_amount) || 0)
                const remaining = Math.max(0, netPayable - (Number(targetBill.amount_received) || 0))
                initialGross = remaining > 0 ? String(remaining) : ''
              }
              setPayForm(f => ({
                ...f,
                bill_id: selectedId,
                gross_amount: initialGross,
                tds_amount: '',
                gst_tds_amount: '',
                labour_cess_amount: '',
                other_deductions: '',
              }))
            }}
          >
            <option value="">Select an RA Bill...</option>
            {raBills.map(b => {
              const netPayable =
                Number(b.net_payable_amount) ||
                Number(b.work_certified_amount) - (Number(b.retention_amount) || 0)
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
          const netPayable =
            Number(activeBill.net_payable_amount) ||
            Number(activeBill.work_certified_amount) - (Number(activeBill.retention_amount) || 0)
          const retention =
            Number(activeBill.retention_amount) ||
            Number(activeBill.work_certified_amount) * (Number(activeBill.retention_percentage || 5) / 100)
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
              <div className="flex justify-between text-teal-700">
                <span>Gross Released to Date:</span>
                <span className="font-semibold">{formatINR(activeBill.amount_received)}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1">
                <span>Net Outstanding Balance:</span>
                <span className="text-rose-600 tabular-nums">{formatINR(outstanding)}</span>
              </div>
            </div>
          )
        })()}

        <FieldWrapper label="Gross Amount Released (₹)" required hint="Sanctioned amount before treasury deductions">
          <CurrencyInput
            value={payForm.gross_amount}
            onChange={e => setPayForm(f => ({ ...f, gross_amount: e.target.value }))}
            placeholder="0.00"
          />
        </FieldWrapper>

        <FieldWrapper label="Payment Date (Treasury Release Date)" required>
          <Input
            type="date"
            value={payForm.date_received}
            onChange={e => setPayForm(f => ({ ...f, date_received: e.target.value }))}
          />
        </FieldWrapper>

        {/* Statutory Deductions Panel */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900">Treasury Statutory Deductions</span>
            <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
              Form 26
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-medium text-slate-600">Income Tax (TDS)</label>
                {grossNum > 0 && (
                  <button
                    type="button"
                    onClick={() => setPayForm(f => ({ ...f, tds_amount: (grossNum * 0.02).toFixed(2) }))}
                    className="text-[10px] text-blue-600 hover:underline font-semibold"
                  >
                    2% Auto
                  </button>
                )}
              </div>
              <CurrencyInput
                value={payForm.tds_amount}
                onChange={e => setPayForm(f => ({ ...f, tds_amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-medium text-slate-600">GST-TDS (2%)</label>
                {grossNum > 0 && (
                  <button
                    type="button"
                    onClick={() => setPayForm(f => ({ ...f, gst_tds_amount: (grossNum * 0.02).toFixed(2) }))}
                    className="text-[10px] text-blue-600 hover:underline font-semibold"
                  >
                    2% Auto
                  </button>
                )}
              </div>
              <CurrencyInput
                value={payForm.gst_tds_amount}
                onChange={e => setPayForm(f => ({ ...f, gst_tds_amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-medium text-slate-600">Labour Cess (1%)</label>
                {grossNum > 0 && (
                  <button
                    type="button"
                    onClick={() => setPayForm(f => ({ ...f, labour_cess_amount: (grossNum * 0.01).toFixed(2) }))}
                    className="text-[10px] text-blue-600 hover:underline font-semibold"
                  >
                    1% Auto
                  </button>
                )}
              </div>
              <CurrencyInput
                value={payForm.labour_cess_amount}
                onChange={e => setPayForm(f => ({ ...f, labour_cess_amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Departmental Itemized Deductions */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-900 block">Departmental / Other Deductions</span>
              <span className="text-[11px] text-slate-500">Royalty, DMFT, penalties, or statutory adjustments</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {['Royalty', 'GST on Royalty', 'TCS', 'DMFT', 'Time Extension Penalty'].map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => handleAddDeductionPreset(tag)}
                className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors font-medium shadow-2xs"
              >
                + {tag}
              </button>
            ))}
          </div>

          {additionalDeductions.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200/80">
              {additionalDeductions.map(item => (
                <div key={item.id} className="flex items-center gap-2">
                  <Input
                    value={item.label}
                    onChange={e => handleUpdateDeduction(item.id, 'label', e.target.value)}
                    placeholder="Deduction Label"
                    className="flex-1 text-xs"
                  />
                  <div className="w-32">
                    <CurrencyInput
                      value={item.amount}
                      onChange={e => handleUpdateDeduction(item.id, 'amount', e.target.value)}
                      placeholder="Amount (₹)"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveDeduction(item.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Net Bank Credit Calculation Card */}
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 space-y-2">
          <div className="flex justify-between text-xs text-slate-600">
            <span>Gross Released:</span>
            <span className="font-semibold text-slate-800">{formatINR(grossNum)}</span>
          </div>
          <div className="flex justify-between text-xs text-rose-700">
            <span>Total Statutory & Other Deductions:</span>
            <span className="font-semibold">- {formatINR(totalDeductions)}</span>
          </div>
          <div className="flex justify-between items-center text-sm font-bold text-emerald-950 pt-2 border-t border-emerald-200">
            <span>Net Bank Credit Amount:</span>
            <span className="text-base text-emerald-700">{formatINR(netBankCredited)}</span>
          </div>
        </div>

        <FieldWrapper label="Treasury Voucher / Transaction Reference (Optional)">
          <Input
            value={payForm.reference}
            onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))}
            placeholder="e.g. UTR-982137498 / Treasury Voucher No. 42"
          />
        </FieldWrapper>

        <FieldWrapper label="Remarks / Payment Notes (Optional)">
          <Textarea
            value={payForm.remarks}
            onChange={e => setPayForm(f => ({ ...f, remarks: e.target.value }))}
            placeholder="e.g. Net payment credited to SBI Current Account after deducting royalty"
            rows={2}
          />
        </FieldWrapper>
      </div>
    </Drawer>
  )
}

