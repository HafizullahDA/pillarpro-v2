'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
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
import { calculateCumulativeThisBill, calculateRABillNetPayable, calculateStatutoryDeductions, calculateDLPReleaseDate } from '@/lib/calculations/raBill'
import { safeMul, safeSub, safeAdd } from '@/lib/calculations/financial'
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

  const [contractorType, setContractorType] = useState<'individual_proprietor' | 'company_firm'>('company_firm')

  const [billForm, setBillForm] = useState({
    project_id: defaultProjectId || '',
    bill_number: '',
    bill_type: 'running' as 'running' | 'first_and_final' | 'final',
    submission_date: getTodayIST(),
    billing_mode: 'standalone' as 'standalone' | 'cumulative',
    previous_bill_id: '',
    work_certified_amount: '',
    retention_percentage: '5.00',
    // CPWA Code Form 23 & 26 Citation & Recovery Fields
    mb_number: '',
    mb_page_start: '',
    mb_page_end: '',
    measurement_date: getTodayIST(),
    measuring_officer_name: '',
    measuring_officer_designation: 'Junior Engineer',
    advance_payments_unmeasured: '',
    cement_recovery: '',
    steel_recovery: '',
    other_material_recovery: '',
    actual_completion_date: '',
    dlp_months: '12',
    remarks: '',
  })

  // Load BOQ items whenever project_id changes and item_wise is active
  const loadBoqItems = useCallback(async (projectId: string) => {
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
  }, [supabase])

  // Synchronize defaultProjectId when drawer opens
  useEffect(() => {
    if (open && defaultProjectId && !billForm.project_id) {
      setBillForm(f => ({ ...f, project_id: defaultProjectId }))
    }
  }, [open, defaultProjectId, billForm.project_id])

  // Automatically load BOQ items when item_wise mode is active and project is selected
  useEffect(() => {
    if (open && entryMode === 'item_wise' && billForm.project_id) {
      loadBoqItems(billForm.project_id)
    }
  }, [open, entryMode, billForm.project_id, loadBoqItems])

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

  // Departmental Material Recoveries & Advance
  const cementRecNum = parseFloat(billForm.cement_recovery) || 0
  const steelRecNum = parseFloat(billForm.steel_recovery) || 0
  const otherMatRecNum = parseFloat(billForm.other_material_recovery) || 0
  const totalMatRecoveries = safeAdd(cementRecNum, steelRecNum, otherMatRecNum)
  const unmeasuredAdvNum = parseFloat(billForm.advance_payments_unmeasured) || 0

  // Pure financial math derivations
  const standaloneRetention = safeMul(certifiedNum, retentionPctNum / 100)
  const standaloneNetPayable = calculateRABillNetPayable({
    workCertified: certifiedNum,
    totalDeductions: safeAdd(standaloneRetention, totalMatRecoveries),
  })

  // Cumulative calculation
  const cumulativeThisBillCertified = calculateCumulativeThisBill({
    currentCumulative: certifiedNum,
    previousCumulative: prevCertified,
  })
  const cumulativeRetention = safeMul(certifiedNum, retentionPctNum / 100)
  const cumulativeNetPassed = calculateRABillNetPayable({
    workCertified: certifiedNum,
    totalDeductions: safeAdd(cumulativeRetention, totalMatRecoveries),
  })
  const cumulativeNetPayableThisBill = Math.max(0, safeSub(cumulativeNetPassed, prevReceived))

  const liveRetentionAmount = isCumulative ? cumulativeRetention : standaloneRetention
  const liveNetPayable = Math.max(0, safeAdd(isCumulative ? cumulativeNetPayableThisBill : standaloneNetPayable, unmeasuredAdvNum))
  const thisBillCertified = isCumulative ? cumulativeThisBillCertified : certifiedNum

  // Estimated statutory treasury deductions (1% or 2% IT-TDS, 2% GST-TDS, 1% Labour Cess)
  const estimatedTreasuryBase = isCumulative ? cumulativeNetPassed : certifiedNum
  const estimatedTreasury = calculateStatutoryDeductions(estimatedTreasuryBase, {
    contractorType,
    retentionPercent: 0,
  })

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
      bill_type: billForm.bill_type,
      submission_date: billForm.submission_date,
      billing_mode: billForm.billing_mode,
      previous_bill_id: billForm.previous_bill_id,
      work_certified_amount: billForm.work_certified_amount,
      retention_percentage: billForm.retention_percentage,
      mb_number: billForm.mb_number,
      mb_page_start: billForm.mb_page_start ? parseInt(billForm.mb_page_start, 10) : null,
      mb_page_end: billForm.mb_page_end ? parseInt(billForm.mb_page_end, 10) : null,
      measurement_date: billForm.measurement_date || undefined,
      measuring_officer_name: billForm.measuring_officer_name,
      measuring_officer_designation: billForm.measuring_officer_designation,
      advance_payments_unmeasured: billForm.advance_payments_unmeasured || 0,
      cement_recovery: billForm.cement_recovery || 0,
      steel_recovery: billForm.steel_recovery || 0,
      other_material_recovery: billForm.other_material_recovery || 0,
      actual_completion_date: billForm.actual_completion_date || undefined,
      dlp_months: billForm.dlp_months || 12,
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
          bill_type: billForm.bill_type,
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
          // CPWA Code Citations & Recoveries
          mb_number: billForm.mb_number.trim() || null,
          mb_page_start: billForm.mb_page_start ? parseInt(billForm.mb_page_start, 10) : null,
          mb_page_end: billForm.mb_page_end ? parseInt(billForm.mb_page_end, 10) : null,
          measurement_date: billForm.measurement_date || null,
          measuring_officer_name: billForm.measuring_officer_name.trim() || null,
          measuring_officer_designation: billForm.measuring_officer_designation.trim() || 'Junior Engineer',
          advance_payments_unmeasured: unmeasuredAdvNum,
          cement_recovery: cementRecNum,
          steel_recovery: steelRecNum,
          other_material_recovery: otherMatRecNum,
          actual_completion_date: billForm.bill_type === 'final' ? (billForm.actual_completion_date || null) : null,
          dlp_months: billForm.bill_type === 'final' ? (parseInt(billForm.dlp_months, 10) || 12) : 12,
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
          .filter((item) => item.current_quantity > 0 || item.previous_quantity > 0)

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
        bill_type: 'running',
        submission_date: getTodayIST(),
        billing_mode: 'standalone',
        previous_bill_id: '',
        work_certified_amount: '',
        retention_percentage: '5.00',
        mb_number: '',
        mb_page_start: '',
        mb_page_end: '',
        measurement_date: getTodayIST(),
        measuring_officer_name: '',
        measuring_officer_designation: 'Junior Engineer',
        advance_payments_unmeasured: '',
        cement_recovery: '',
        steel_recovery: '',
        other_material_recovery: '',
        actual_completion_date: '',
        dlp_months: '12',
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

        {/* Bill Classification (CPWA Code Statutory Forms) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Bill Classification (CPWA Code)
          </label>
          <div className="grid grid-cols-3 p-1 bg-slate-100 rounded-xl gap-1 text-center">
            <button
              type="button"
              onClick={() => setBillForm(f => ({ ...f, bill_type: 'running' }))}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                billForm.bill_type === 'running'
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Running (Form 26)
            </button>
            <button
              type="button"
              onClick={() => setBillForm(f => ({ ...f, bill_type: 'first_and_final' }))}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                billForm.bill_type === 'first_and_final'
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              1st & Final (Form 24)
            </button>
            <button
              type="button"
              onClick={() => setBillForm(f => ({ ...f, bill_type: 'final' }))}
              className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
                billForm.bill_type === 'final'
                  ? 'bg-amber-500 text-white shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>Final (Form 27-B)</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-400 text-amber-950 font-bold">
                Yellow
              </span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {billForm.bill_type === 'running'
              ? 'Standard intermediate running account bill for ongoing works as per CPWA Form 26.'
              : billForm.bill_type === 'first_and_final'
              ? 'Single-payment contract settlement for piece-work jobs as per CPWA Form 24.'
              : 'Final contract closure bill (Form 27-B / Form 26 Final). Triggers Defect Liability Period countdown.'}
          </p>
        </div>

        {/* Final Bill Closure Banner & DLP Settings */}
        {billForm.bill_type === 'final' && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-3">
            <div className="flex items-center justify-between font-bold text-amber-900">
              <span className="flex items-center gap-1.5">
                <span>⚠️</span>
                <span>Final Bill Contract Closure Settings</span>
              </span>
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
                Yellow Paper Form
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FieldWrapper label="Actual Completion Date" required hint="Physical work completion date">
                <Input
                  type="date"
                  value={billForm.actual_completion_date}
                  onChange={e => setBillForm(f => ({ ...f, actual_completion_date: e.target.value }))}
                />
              </FieldWrapper>
              <FieldWrapper label="Defect Liability Period (DLP)" hint="Months until retention is released">
                <Select
                  value={billForm.dlp_months}
                  onChange={e => setBillForm(f => ({ ...f, dlp_months: e.target.value }))}
                >
                  <option value="6">6 Months</option>
                  <option value="12">12 Months (1 Year)</option>
                  <option value="24">24 Months (2 Years)</option>
                  <option value="36">36 Months (3 Years)</option>
                  <option value="60">60 Months (5 Years - NHAI/PMGSY)</option>
                </Select>
              </FieldWrapper>
            </div>
            {billForm.actual_completion_date && (
              <p className="text-[11px] font-semibold text-amber-800 pt-1 border-t border-amber-200/60">
                📅 Retention Release Scheduled For:{' '}
                <strong className="font-mono text-slate-900">
                  {calculateDLPReleaseDate(billForm.actual_completion_date, Number(billForm.dlp_months) || 12)}
                </strong>
              </p>
            )}
          </div>
        )}

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

        {/* Measurement Book (MB) Reference (CPWA Form 23 & Form 26 Account II) */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>📖</span>
              <span>Measurement Book (MB) Reference</span>
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              CPWA Form 23 & Form 26 Account II
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <FieldWrapper label="MB Book No." hint="e.g. MB-412">
              <Input
                value={billForm.mb_number}
                onChange={e => setBillForm(f => ({ ...f, mb_number: e.target.value }))}
                placeholder="e.g. MB-412"
              />
            </FieldWrapper>
            <FieldWrapper label="Page From" hint="Start page">
              <Input
                type="number"
                min="1"
                value={billForm.mb_page_start}
                onChange={e => setBillForm(f => ({ ...f, mb_page_start: e.target.value }))}
                placeholder="e.g. 14"
              />
            </FieldWrapper>
            <FieldWrapper label="Page To" hint="End page">
              <Input
                type="number"
                min="1"
                value={billForm.mb_page_end}
                onChange={e => setBillForm(f => ({ ...f, mb_page_end: e.target.value }))}
                placeholder="e.g. 28"
              />
            </FieldWrapper>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <FieldWrapper label="Measurement Date" hint="Date recorded in MB">
              <Input
                type="date"
                value={billForm.measurement_date}
                onChange={e => setBillForm(f => ({ ...f, measurement_date: e.target.value }))}
              />
            </FieldWrapper>
            <FieldWrapper label="Measuring Officer" hint="e.g. Er. A. K. Sharma, JE">
              <Input
                value={billForm.measuring_officer_name}
                onChange={e => setBillForm(f => ({ ...f, measuring_officer_name: e.target.value }))}
                placeholder="e.g. Er. Rajesh Kumar, JE"
              />
            </FieldWrapper>
          </div>
        </div>

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
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <label className="text-xs font-semibold text-slate-700">
              Contractual Security Deposit / Retention (CPWA Item 5)
            </label>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400">Presets:</span>
              {[
                { label: '0% (PBG)', val: '0' },
                { label: '2.5% (CPWD)', val: '2.50' },
                { label: '5% (PWD)', val: '5.00' },
                { label: '10%', val: '10.00' },
              ].map(p => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => setBillForm(f => ({ ...f, retention_percentage: p.val }))}
                  className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                    billForm.retention_percentage === p.val
                      ? 'bg-slate-900 text-white border-slate-900 font-bold'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="Retention (%)" required hint="Adjustable per tender agreement">
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

            <FieldWrapper label="Withheld Retention (₹)" hint="Auto-computed or held till DLP">
              <div className="h-10 px-3 flex items-center rounded-lg bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700">
                {formatINR(liveRetentionAmount)}
              </div>
            </FieldWrapper>
          </div>
        </div>

        {/* CPWA Code Recoveries & Unmeasured Advance (Form 26 Account III) */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <span>🏗️</span> Departmental Store Recoveries & Advances
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
              Form 26 Item 2 & 8(a)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FieldWrapper label="Unmeasured Advance (Item 2)" hint="On-account advance for unmeasured work">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={billForm.advance_payments_unmeasured}
                onChange={e => setBillForm(f => ({ ...f, advance_payments_unmeasured: e.target.value }))}
                placeholder="0.00"
              />
            </FieldWrapper>

            <FieldWrapper label="Cement Recovery (Item 8a)" hint="Store issue Form 35-A value">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={billForm.cement_recovery}
                onChange={e => setBillForm(f => ({ ...f, cement_recovery: e.target.value }))}
                placeholder="0.00"
              />
            </FieldWrapper>

            <FieldWrapper label="Steel Recovery (Item 8a)" hint="Store issue Form 35-A value">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={billForm.steel_recovery}
                onChange={e => setBillForm(f => ({ ...f, steel_recovery: e.target.value }))}
                placeholder="0.00"
              />
            </FieldWrapper>

            <FieldWrapper label="Other Material / Plant Recovery" hint="Tools, machinery or misc credit">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={billForm.other_material_recovery}
                onChange={e => setBillForm(f => ({ ...f, other_material_recovery: e.target.value }))}
                placeholder="0.00"
              />
            </FieldWrapper>
          </div>
        </div>

        {/* Cumulative Math Calculation Breakdown Card */}
        {isCumulative ? (
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 text-xs space-y-2">
            <div className="font-semibold text-blue-900 flex items-center justify-between border-b border-blue-100 pb-1.5">
              <span>Form 26 Cumulative Breakdown (Account III)</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                CPWD Standard
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Item 1: Total Work to Date (MB Cumulative):</span>
              <span className="font-semibold text-slate-800">{formatINR(certifiedNum)}</span>
            </div>
            {unmeasuredAdvNum > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Item 2: Advance for Unmeasured Work:</span>
                <span className="font-semibold">+ {formatINR(unmeasuredAdvNum)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Less Previous Certified Work:</span>
              <span className="font-semibold text-slate-800">- {formatINR(prevCertified)}</span>
            </div>
            <div className="flex justify-between text-blue-800 font-semibold pt-1 border-t border-blue-100/60">
              <span>Work Certified This Bill:</span>
              <span>{formatINR(thisBillCertified)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Item 5: Less Retention on Total Work ({retentionPctNum}%):</span>
              <span className="font-semibold text-red-600">- {formatINR(liveRetentionAmount)}</span>
            </div>
            {cementRecNum > 0 && (
              <div className="flex justify-between text-amber-700">
                <span>Item 8(a): Less Cement Recovery (Form 35-A):</span>
                <span className="font-semibold">- {formatINR(cementRecNum)}</span>
              </div>
            )}
            {steelRecNum > 0 && (
              <div className="flex justify-between text-amber-700">
                <span>Item 8(a): Less Steel Recovery (Form 35-A):</span>
                <span className="font-semibold">- {formatINR(steelRecNum)}</span>
              </div>
            )}
            {otherMatRecNum > 0 && (
              <div className="flex justify-between text-amber-700">
                <span>Item 8(a): Less Other Material/Plant Recovery:</span>
                <span className="font-semibold">- {formatINR(otherMatRecNum)}</span>
              </div>
            )}
            {prevReceived > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Item 7: Less Prior Payments Received:</span>
                <span className="font-semibold text-slate-800">- {formatINR(prevReceived)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-1.5 border-t border-blue-200">
              <span>Net Payable This Bill (Item 8c):</span>
              <span className="text-blue-700">{formatINR(liveNetPayable)}</span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs space-y-2">
            <div className="flex justify-between items-center font-semibold text-slate-800 border-b border-slate-200 pb-1.5">
              <span>Form 26 Deduction Breakdown (Account III)</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                PWD Standard
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Item 1: Work Certified:</span>
              <span className="font-semibold text-slate-800">{formatINR(certifiedNum)}</span>
            </div>
            {unmeasuredAdvNum > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Item 2: Advance for Unmeasured Work:</span>
                <span className="font-semibold">+ {formatINR(unmeasuredAdvNum)}</span>
              </div>
            )}
            <div className="flex justify-between text-amber-700">
              <span>Item 5: Less Retention Withheld ({retentionPctNum}%):</span>
              <span className="font-semibold">- {formatINR(standaloneRetention)}</span>
            </div>
            {cementRecNum > 0 && (
              <div className="flex justify-between text-amber-700">
                <span>Item 8(a): Less Cement Recovery:</span>
                <span className="font-semibold">- {formatINR(cementRecNum)}</span>
              </div>
            )}
            {steelRecNum > 0 && (
              <div className="flex justify-between text-amber-700">
                <span>Item 8(a): Less Steel Recovery:</span>
                <span className="font-semibold">- {formatINR(steelRecNum)}</span>
              </div>
            )}
            {otherMatRecNum > 0 && (
              <div className="flex justify-between text-amber-700">
                <span>Item 8(a): Less Other Material Recovery:</span>
                <span className="font-semibold">- {formatINR(otherMatRecNum)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
              <span>Net Payable (Passed for Payment):</span>
              <span className="text-blue-700">{formatINR(liveNetPayable)}</span>
            </div>
          </div>
        )}

        {/* Estimated Treasury Inflow Card with Entity Selection */}
        {certifiedNum > 0 && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3.5 text-xs space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <span className="flex items-center gap-1.5 font-bold text-emerald-900">
                <span>🏛️</span>
                <span>Estimated Treasury Realization</span>
              </span>
              {/* Entity Selector */}
              <div className="inline-flex rounded-lg bg-white border border-emerald-200 p-0.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setContractorType('individual_proprietor')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    contractorType === 'individual_proprietor'
                      ? 'bg-emerald-700 text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Proprietor (1% TDS)
                </button>
                <button
                  type="button"
                  onClick={() => setContractorType('company_firm')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    contractorType === 'company_firm'
                      ? 'bg-emerald-700 text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Firm / Co (2% TDS)
                </button>
              </div>
            </div>

            <p className="text-[11px] text-emerald-800/80 leading-relaxed">
              Statutory audit estimate: {contractorType === 'individual_proprietor' ? '1%' : '2%'} IT TDS ({formatINR(estimatedTreasury.itTds)}) + 2% GST-TDS ({formatINR(estimatedTreasury.gstTds)}) + 1% Labour Cess ({formatINR(estimatedTreasury.labourCess)}).
              <span className="block text-[10px] text-emerald-600 mt-0.5">
                Note: Exact deductions and departmental recoveries (Royalty, Testing) can be manually modified when logging the payment voucher.
              </span>
            </p>

            <div className="flex justify-between items-center pt-1.5 border-t border-emerald-200/60 font-semibold text-emerald-900">
              <span>Estimated Net Bank Credit:</span>
              <span className="text-sm font-bold text-emerald-700 tabular-nums">
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

