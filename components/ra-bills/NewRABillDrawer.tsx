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

import { BOQSummaryItem } from '@/lib/types/boq'

interface NewRABillDrawerProps {
  open: boolean
  onClose: () => void
  projects: ProjectOption[]
  raBills: RABillOption[]
  defaultProjectId?: string
  onTriggerScan?: () => void
}

export function NewRABillDrawer({
  open,
  onClose,
  projects,
  raBills,
  defaultProjectId,
  onTriggerScan,
}: NewRABillDrawerProps) {
  const router = useRouter()
  const supabase = createClient()
  const toast = useToast()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  // Billing Entry Mode: Lump-Sum (Direct) or Item-Wise (e-MB Measurement)
  const [entryMode, setEntryMode] = useState<'lump_sum' | 'item_wise'>('lump_sum')
  const [boqItems, setBoqItems] = useState<BOQSummaryItem[]>([])
  const [loadingBoq, setLoadingBoq] = useState(false)
  const [itemMeasurements, setItemMeasurements] = useState<
    Record<string, { currentQty: string; remarks: string }>
  >({})

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

  // Load BOQ items whenever project_id changes and item_wise is active
  const loadBoqItems = async (projectId: string) => {
    if (!projectId) {
      setBoqItems([])
      return
    }
    setLoadingBoq(true)
    try {
      const { data, error } = await supabase.rpc('get_project_boq_summary', {
        p_project_id: projectId,
      })
      if (!error && data) {
        setBoqItems(data as BOQSummaryItem[])
      } else {
        // Fallback to table select if RPC not available
        const { data: rawData } = await supabase
          .from('boq_items')
          .select('*')
          .eq('project_id', projectId)
          .order('item_number', { ascending: true })

        if (rawData) {
          setBoqItems(
            rawData.map((r: any) => ({
              boq_item_id: r.id,
              item_number: r.item_number,
              description: r.description,
              unit: r.unit,
              tender_quantity: Number(r.tender_quantity) || 0,
              awarded_rate: Number(r.awarded_rate) || 0,
              tender_amount: Number(r.total_amount) || 0,
              cumulative_executed_qty: 0,
              remaining_qty: Number(r.tender_quantity) || 0,
              cumulative_executed_amount: 0,
              work_done_percentage: 0,
            }))
          )
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingBoq(false)
    }
  }

  // Handle measurement input changes
  const handleMeasurementChange = (
    boqItemId: string,
    currentQtyStr: string,
    remarksStr?: string
  ) => {
    const updated = {
      ...itemMeasurements,
      [boqItemId]: {
        currentQty: currentQtyStr,
        remarks: remarksStr !== undefined ? remarksStr : itemMeasurements[boqItemId]?.remarks || '',
      },
    }
    setItemMeasurements(updated)

    // Calculate total certified amount from items
    let totalCurrent = 0
    let totalCumulative = 0
    for (const b of boqItems) {
      const enteredQty = parseFloat(updated[b.boq_item_id]?.currentQty) || 0
      const prevQty = Number(b.cumulative_executed_qty) || 0
      totalCurrent += enteredQty * b.awarded_rate
      totalCumulative += (prevQty + enteredQty) * b.awarded_rate
    }

    const calculatedAmount = billForm.billing_mode === 'cumulative' ? totalCumulative : totalCurrent
    setBillForm(f => ({
      ...f,
      work_certified_amount: calculatedAmount > 0 ? calculatedAmount.toFixed(2) : '',
    }))
  }

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

      const { data: createdBill, error: err } = await supabase
        .from('ra_bills')
        .insert({
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
          billing_entry_mode: entryMode,
        })
        .select('id')
        .single()

      if (err) {
        const { userMessage } = translateError(err)
        setError(userMessage)
        setSaving(false)
        return
      }

      // If Item-Wise mode, insert into ra_bill_items
      if (entryMode === 'item_wise' && createdBill?.id) {
        const itemsToInsert = boqItems
          .map((b) => {
            const entered = itemMeasurements[b.boq_item_id]
            const currQty = parseFloat(entered?.currentQty || '0') || 0
            const prevQty = Number(b.cumulative_executed_qty) || 0
            return {
              ra_bill_id: createdBill.id,
              boq_item_id: b.boq_item_id,
              previous_quantity: prevQty,
              current_quantity: currQty,
              rate: b.awarded_rate,
              remarks: entered?.remarks?.trim() || null,
            }
          })
          .filter((item) => item.current_quantity > 0)

        if (itemsToInsert.length > 0) {
          const { error: itemsErr } = await supabase
            .from('ra_bill_items')
            .insert(itemsToInsert)

          if (itemsErr) {
            console.warn('Failed to insert e-MB ra_bill_items:', itemsErr.message)
          }
        }
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
      setItemMeasurements({})
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

        {onTriggerScan && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-sm shadow-sm">
                ✨
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">Auto-fill with AI Scan</p>
                <p className="text-[11px] text-slate-500">Scan Form 26 or bill summary</p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                onClose()
                onTriggerScan()
              }}
              className="text-xs h-7 px-2.5 border-blue-200 text-blue-700 hover:bg-white bg-white/80"
            >
              Scan Bill
            </Button>
          </div>
        )}

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
              if (entryMode === 'item_wise') {
                loadBoqItems(pId)
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

        {/* Measurement Entry Mode Toggle: Lump-Sum vs Item-Wise (e-MB) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Bill Calculation Method
          </label>
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setEntryMode('lump_sum')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                entryMode === 'lump_sum'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Lump-Sum Quick Entry
            </button>
            <button
              type="button"
              onClick={() => {
                setEntryMode('item_wise')
                if (billForm.project_id && boqItems.length === 0) {
                  loadBoqItems(billForm.project_id)
                }
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                entryMode === 'item_wise'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>Item-Wise (e-MB)</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                BOQ
              </span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {entryMode === 'item_wise'
              ? 'Enter item-wise executed measurements; certified amount & work-done % compute automatically.'
              : 'Direct gross certified value input without itemized measurement book entries.'}
          </p>
        </div>

        {/* Item-Wise Measurement Book (e-MB) Table Section */}
        {entryMode === 'item_wise' && (
          <div className="space-y-2 pt-1 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Measurement Book (e-MB) Items
              </span>
              <span className="text-[11px] text-slate-500">
                {boqItems.length} BOQ items loaded
              </span>
            </div>

            {loadingBoq ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                Loading project BOQ schedule...
              </div>
            ) : !billForm.project_id ? (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                Select a project above to load its BOQ schedule.
              </div>
            ) : boqItems.length === 0 ? (
              <div className="p-4 text-center text-xs text-amber-800 bg-amber-50 rounded-xl border border-amber-200">
                No BOQ items configured for this project yet. You can switch to Lump-Sum mode or add BOQ items in Project details.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 border-b border-slate-200 sticky top-0 text-slate-700 font-semibold text-[10px]">
                    <tr>
                      <th className="p-2 w-12">Item</th>
                      <th className="p-2">Description</th>
                      <th className="p-2 text-right">Tender Qty</th>
                      <th className="p-2 text-right">Prev Qty</th>
                      <th className="p-2 text-right w-24">This Bill Qty</th>
                      <th className="p-2 text-right">Rate</th>
                      <th className="p-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {boqItems.map((item) => {
                      const entered = itemMeasurements[item.boq_item_id]
                      const currQty = parseFloat(entered?.currentQty || '0') || 0
                      const prevQty = Number(item.cumulative_executed_qty) || 0
                      const cumQty = prevQty + currQty
                      const isOver = item.tender_quantity > 0 && cumQty > item.tender_quantity
                      const itemAmount = currQty * item.awarded_rate

                      return (
                        <tr key={item.boq_item_id} className="hover:bg-slate-50/70">
                          <td className="p-2 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {item.item_number}
                          </td>
                          <td className="p-2 text-slate-700 max-w-[140px] truncate" title={item.description}>
                            {item.description}
                          </td>
                          <td className="p-2 text-right tabular-nums text-slate-600">
                            {Number(item.tender_quantity).toLocaleString('en-IN')} {item.unit}
                          </td>
                          <td className="p-2 text-right tabular-nums text-slate-500">
                            {prevQty.toLocaleString('en-IN')}
                          </td>
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              step="0.001"
                              min="0"
                              placeholder="0.00"
                              value={entered?.currentQty || ''}
                              onChange={(e) => handleMeasurementChange(item.boq_item_id, e.target.value)}
                              className={`w-20 text-xs text-right p-1 rounded border focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium ${
                                isOver ? 'border-amber-400 bg-amber-50/50' : 'border-slate-300'
                              }`}
                            />
                            {isOver && (
                              <span className="block text-[9px] text-amber-700 font-semibold mt-0.5">
                                Variation!
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-right tabular-nums text-slate-600">
                            ₹{Number(item.awarded_rate).toLocaleString('en-IN')}
                          </td>
                          <td className="p-2 text-right tabular-nums font-bold text-slate-900">
                            {formatINR(itemAmount)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Billing Mode Segmented Toggle */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Billing Sequence Mode</label>
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
            entryMode === 'item_wise'
              ? 'Auto-computed from individual e-MB measurements entered above'
              : isCumulative
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

