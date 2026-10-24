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
import { calculateCumulativeThisBill, calculateRABillNetPayable, calculateStatutoryDeductions, calculateDLPReleaseDate, calculatePWDStatutoryDeductions, PWDStatutoryDeductionsResult } from '@/lib/calculations/raBill'
import { safeMul, safeSub, safeAdd } from '@/lib/calculations/financial'
import { ProjectOption, RABillOption } from '@/app/(app)/ra-bills/RABillActions'

import { BOQSummaryItem } from '@/lib/types/boq'

export interface EditRABillData {
  id: string
  project_id: string
  bill_number: string
  bill_type?: 'running' | 'first_and_final' | 'final'
  submission_date: string
  billing_mode?: 'standalone' | 'cumulative'
  billing_entry_mode?: 'lump_sum' | 'item_wise'
  previous_bill_id?: string | null
  work_certified_amount: number
  retention_percentage?: number
  retention_amount?: number
  bg_offset_amount?: number
  bg_applied_id?: string | null
  gross_retention_required?: number
  net_retention_withheld?: number
  net_payable_amount?: number
  amount_received?: number
  cumulative_certified_amount?: number | null
  previous_certified_amount?: number
  previous_received_amount?: number
  net_payable_this_bill?: number
  this_bill_work_certified?: number
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
  retention_mode?: 'percent' | 'amount'
  it_tds_percentage?: number
  it_tds_amount?: number
  gst_tds_percentage?: number
  gst_tds_amount?: number
  labour_cess_percentage?: number
  labour_cess_amount?: number
  royalty_recovery?: number
  mobilization_advance_recovery?: number
  withheld_amount?: number
  deductions_breakdown?: any
  document_url?: string | null
  remarks?: string | null
  status?: string
}

export interface NewRABillDrawerProps {
  open: boolean
  onClose: () => void
  projects: ProjectOption[]
  raBills: RABillOption[]
  defaultProjectId?: string
  onTriggerScan?: () => void
  editBill?: EditRABillData | null
  onSuccess?: (savedBill: any) => void
}

export function NewRABillDrawer({
  open,
  onClose,
  projects,
  raBills,
  defaultProjectId,
  onTriggerScan,
  editBill,
  onSuccess,
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

  // Statutory Deductions State
  const [retentionMode, setRetentionMode] = useState<'percent' | 'amount'>('percent')
  const [retentionCustomAmount, setRetentionCustomAmount] = useState('')
  const [itTdsMode, setItTdsMode] = useState<'1_percent' | '2_percent' | 'custom_amount'>('2_percent')
  const [itTdsCustomAmount, setItTdsCustomAmount] = useState('')
  const [gstTdsMode, setGstTdsMode] = useState<'percent' | 'amount'>('percent')
  const [gstTdsPercent, setGstTdsPercent] = useState('2.00')
  const [gstTdsCustomAmount, setGstTdsCustomAmount] = useState('')
  const [labourCessMode, setLabourCessMode] = useState<'percent' | 'amount'>('percent')
  const [labourCessPercent, setLabourCessPercent] = useState('1.00')
  const [labourCessCustomAmount, setLabourCessCustomAmount] = useState('')
  const [royaltyRecovery, setRoyaltyRecovery] = useState('')
  const [mobilizationAdvanceRecovery, setMobilizationAdvanceRecovery] = useState('')
  const [withheldAmount, setWithheldAmount] = useState('')

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

  // CPWD GCC Clause 1A Bank Guarantee offset state
  const [activeDeposits, setActiveDeposits] = useState<
    { id: string; reference_number: string; amount: number; deposit_type: string; issuing_bank?: string | null }[]
  >([])
  const [selectedBgId, setSelectedBgId] = useState<string>('')
  const [applyBgOffset, setApplyBgOffset] = useState<boolean>(true)

  // Fetch active BGs / security deposits for BG offset per CPWD GCC Clause 1A
  useEffect(() => {
    if (!billForm.project_id) {
      setActiveDeposits([])
      setSelectedBgId('')
      return
    }
    supabase
      .from('security_deposits')
      .select('id, reference_number, amount, deposit_type, issuing_bank')
      .eq('project_id', billForm.project_id)
      .eq('status', 'active')
      .then(({ data }) => {
        const bgs = (data || []).map(d => ({
          id: d.id,
          reference_number: d.reference_number,
          amount: Number(d.amount) || 0,
          deposit_type: d.deposit_type,
          issuing_bank: d.issuing_bank,
        }))
        setActiveDeposits(bgs)
        if (bgs.length > 0) {
          if (editBill?.bg_applied_id && bgs.some(b => b.id === editBill.bg_applied_id)) {
            setSelectedBgId(editBill.bg_applied_id)
            setApplyBgOffset(true)
          } else if (!selectedBgId) {
            setSelectedBgId(bgs[0].id)
          }
        }
      })
  }, [billForm.project_id, supabase, editBill?.bg_applied_id, selectedBgId])

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

  // Synchronize form when drawer opens (edit mode or new submission)
  useEffect(() => {
    if (!open) return

    if (editBill) {
      setBillForm({
        project_id: editBill.project_id || defaultProjectId || '',
        bill_number: editBill.bill_number || '',
        bill_type: (editBill.bill_type as any) || 'running',
        submission_date: editBill.submission_date || getTodayIST(),
        billing_mode: (editBill.billing_mode as any) || 'standalone',
        previous_bill_id: editBill.previous_bill_id || '',
        work_certified_amount: editBill.work_certified_amount != null ? String(editBill.work_certified_amount) : '',
        retention_percentage: editBill.retention_percentage != null ? String(editBill.retention_percentage) : '5.00',
        mb_number: editBill.mb_number || '',
        mb_page_start: editBill.mb_page_start != null ? String(editBill.mb_page_start) : '',
        mb_page_end: editBill.mb_page_end != null ? String(editBill.mb_page_end) : '',
        measurement_date: editBill.measurement_date || getTodayIST(),
        measuring_officer_name: editBill.measuring_officer_name || '',
        measuring_officer_designation: editBill.measuring_officer_designation || 'Junior Engineer',
        advance_payments_unmeasured: editBill.advance_payments_unmeasured != null && editBill.advance_payments_unmeasured !== 0 ? String(editBill.advance_payments_unmeasured) : '',
        cement_recovery: editBill.cement_recovery != null && editBill.cement_recovery !== 0 ? String(editBill.cement_recovery) : '',
        steel_recovery: editBill.steel_recovery != null && editBill.steel_recovery !== 0 ? String(editBill.steel_recovery) : '',
        other_material_recovery: editBill.other_material_recovery != null && editBill.other_material_recovery !== 0 ? String(editBill.other_material_recovery) : '',
        actual_completion_date: editBill.actual_completion_date || '',
        dlp_months: editBill.dlp_months != null ? String(editBill.dlp_months) : '12',
        remarks: editBill.remarks || '',
      })
      const bd = editBill.deductions_breakdown || {}
      setRetentionMode(editBill.retention_mode || (bd.retention_mode === 'amount' ? 'amount' : 'percent'))
      setRetentionCustomAmount(bd.retention_custom_amount != null && bd.retention_custom_amount > 0 ? String(bd.retention_custom_amount) : '')
      setItTdsMode(bd.it_tds_mode || (editBill.it_tds_percentage === 1 ? '1_percent' : editBill.it_tds_amount ? 'custom_amount' : '2_percent'))
      setItTdsCustomAmount(editBill.it_tds_amount != null && editBill.it_tds_amount > 0 ? String(editBill.it_tds_amount) : '')
      setGstTdsMode(bd.gst_tds_mode || (editBill.gst_tds_amount ? 'amount' : 'percent'))
      setGstTdsPercent(editBill.gst_tds_percentage != null ? String(editBill.gst_tds_percentage) : '2.00')
      setGstTdsCustomAmount(editBill.gst_tds_amount != null && editBill.gst_tds_amount > 0 ? String(editBill.gst_tds_amount) : '')
      setLabourCessMode(bd.labour_cess_mode || (editBill.labour_cess_amount ? 'amount' : 'percent'))
      setLabourCessPercent(editBill.labour_cess_percentage != null ? String(editBill.labour_cess_percentage) : '1.00')
      setLabourCessCustomAmount(editBill.labour_cess_amount != null && editBill.labour_cess_amount > 0 ? String(editBill.labour_cess_amount) : '')
      setRoyaltyRecovery(editBill.royalty_recovery != null && editBill.royalty_recovery > 0 ? String(editBill.royalty_recovery) : '')
      setMobilizationAdvanceRecovery(editBill.mobilization_advance_recovery != null && editBill.mobilization_advance_recovery > 0 ? String(editBill.mobilization_advance_recovery) : '')
      setWithheldAmount(editBill.withheld_amount != null && editBill.withheld_amount > 0 ? String(editBill.withheld_amount) : '')
      const isItemWise = editBill.billing_entry_mode === 'item_wise'
      setEntryMode(isItemWise ? 'item_wise' : 'lump_sum')
      setSelectedFile(null)
      setError('')

      if (isItemWise && editBill.id) {
        supabase
          .from('ra_bill_items')
          .select('*')
          .eq('ra_bill_id', editBill.id)
          .then(({ data, error: itemErr }) => {
            if (!itemErr && data && data.length > 0) {
              const measurements: Record<string, { currentQty: string; remarks: string }> = {}
              data.forEach((item: any) => {
                measurements[item.boq_item_id] = {
                  currentQty: item.current_quantity != null ? String(item.current_quantity) : '',
                  remarks: item.remarks || '',
                }
              })
              setItemMeasurements(measurements)
            }
          })
      }
    } else {
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
      setRetentionMode('percent')
      setRetentionCustomAmount('')
      setItTdsMode('2_percent')
      setItTdsCustomAmount('')
      setGstTdsMode('percent')
      setGstTdsPercent('2.00')
      setGstTdsCustomAmount('')
      setLabourCessMode('percent')
      setLabourCessPercent('1.00')
      setLabourCessCustomAmount('')
      setRoyaltyRecovery('')
      setMobilizationAdvanceRecovery('')
      setWithheldAmount('')
      setEntryMode('lump_sum')
      setItemMeasurements({})
      setSelectedFile(null)
      setError('')
    }
  }, [open, editBill, defaultProjectId, supabase])

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

  // Bank Guarantee offset per CPWD GCC Clause 1A
  const selectedBg = activeDeposits.find(d => d.id === selectedBgId) || (activeDeposits.length > 0 ? activeDeposits[0] : null)
  const availableBgAmount = applyBgOffset && selectedBg ? Number(selectedBg.amount) || 0 : 0

  // Cumulative calculation
  const cumulativeThisBillCertified = calculateCumulativeThisBill({
    currentCumulative: certifiedNum,
    previousCumulative: prevCertified,
  })
  const thisBillCertified = isCumulative ? cumulativeThisBillCertified : certifiedNum

  // Official CPWD & State PWD Form 26 Statutory Deductions Engine
  const pwdDeductions = calculatePWDStatutoryDeductions({
    workCertified: thisBillCertified,
    unmeasuredAdvance: unmeasuredAdvNum,
    retentionMode,
    retentionPercent: retentionPctNum,
    retentionCustomAmount: parseFloat(retentionCustomAmount) || 0,
    bgOffsetAmount: availableBgAmount,
    itTdsMode,
    itTdsCustomAmount: parseFloat(itTdsCustomAmount) || 0,
    gstTdsMode,
    gstTdsPercent: parseFloat(gstTdsPercent) || 2.0,
    gstTdsCustomAmount: parseFloat(gstTdsCustomAmount) || 0,
    labourCessMode,
    labourCessPercent: parseFloat(labourCessPercent) || 1.0,
    labourCessCustomAmount: parseFloat(labourCessCustomAmount) || 0,
    cementRecovery: cementRecNum,
    steelRecovery: steelRecNum,
    otherMaterialRecovery: otherMatRecNum,
    royaltyRecovery: parseFloat(royaltyRecovery) || 0,
    mobilizationAdvanceRecovery: parseFloat(mobilizationAdvanceRecovery) || 0,
    withheldAmount: parseFloat(withheldAmount) || 0,
    previousPaymentsAlreadyMade: isCumulative ? prevReceived : 0,
  })

  const grossRetention = pwdDeductions.grossRetentionRequired
  const bgOffsetAmount = pwdDeductions.bgOffsetApplied
  const netRetentionWithheld = pwdDeductions.netRetentionWithheld
  const liveRetentionAmount = netRetentionWithheld
  const liveNetPayable = pwdDeductions.netPayableAmount
  const grossWorkA = pwdDeductions.grossWorkCertified
  const totalDeductionsB = pwdDeductions.totalAllDeductions

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
      retention_percentage: retentionMode === 'percent' ? (billForm.retention_percentage || 5) : (certifiedNum > 0 ? Number(((pwdDeductions.grossRetentionRequired / certifiedNum) * 100).toFixed(2)) : 5),
      retention_mode: retentionMode,
      retention_amount: pwdDeductions.netRetentionWithheld,
      it_tds_percentage: pwdDeductions.itTdsEffectivePercent,
      it_tds_amount: pwdDeductions.itTdsAmount,
      gst_tds_percentage: pwdDeductions.gstTdsEffectivePercent,
      gst_tds_amount: pwdDeductions.gstTdsAmount,
      labour_cess_percentage: pwdDeductions.labourCessEffectivePercent,
      labour_cess_amount: pwdDeductions.labourCessAmount,
      royalty_recovery: pwdDeductions.royaltyRecovery,
      mobilization_advance_recovery: pwdDeductions.mobilizationAdvanceRecovery,
      withheld_amount: pwdDeductions.withheldAmount,
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

      if (editBill) {
        const deductionsBreakdown = {
          retention_mode: retentionMode,
          retention_percentage: retentionMode === 'percent' ? retentionPctNum : (certifiedNum > 0 ? Number(((pwdDeductions.grossRetentionRequired / certifiedNum) * 100).toFixed(2)) : 5),
          retention_custom_amount: parseFloat(retentionCustomAmount) || 0,
          gross_retention: pwdDeductions.grossRetentionRequired,
          bg_offset_applied: pwdDeductions.bgOffsetApplied,
          net_retention: pwdDeductions.netRetentionWithheld,
          it_tds_mode: itTdsMode,
          it_tds_percentage: pwdDeductions.itTdsEffectivePercent,
          it_tds_amount: pwdDeductions.itTdsAmount,
          gst_tds_mode: gstTdsMode,
          gst_tds_percentage: pwdDeductions.gstTdsEffectivePercent,
          gst_tds_amount: pwdDeductions.gstTdsAmount,
          labour_cess_mode: labourCessMode,
          labour_cess_percentage: pwdDeductions.labourCessEffectivePercent,
          labour_cess_amount: pwdDeductions.labourCessAmount,
          cement_recovery: cementRecNum,
          steel_recovery: steelRecNum,
          other_material_recovery: otherMatRecNum,
          departmental_recoveries_total: pwdDeductions.departmentalRecoveries.total,
          royalty_recovery: pwdDeductions.royaltyRecovery,
          mobilization_advance_recovery: pwdDeductions.mobilizationAdvanceRecovery,
          withheld_amount: pwdDeductions.withheldAmount,
          total_statutory_taxes: pwdDeductions.totalStatutoryTaxes,
          total_departmental_recoveries: pwdDeductions.departmentalRecoveries.total,
          total_other_recoveries: pwdDeductions.totalOtherRecoveries,
          total_all_deductions: pwdDeductions.totalAllDeductions,
          gross_work_certified: pwdDeductions.grossWorkCertified,
          net_payable: pwdDeductions.netPayableAmount,
        }

        const updatePayload: Record<string, any> = {
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
          net_payable_this_bill: pwdDeductions.netPayableAmount,
          work_certified_amount: certifiedNum,
          retention_percentage: retentionMode === 'percent' ? retentionPctNum : (certifiedNum > 0 ? Number(((pwdDeductions.grossRetentionRequired / certifiedNum) * 100).toFixed(2)) : 5),
          retention_amount: pwdDeductions.netRetentionWithheld,
          bg_offset_amount: pwdDeductions.bgOffsetApplied,
          bg_applied_id: pwdDeductions.bgOffsetApplied > 0 ? (selectedBg?.id || null) : null,
          gross_retention_required: pwdDeductions.grossRetentionRequired,
          net_retention_withheld: pwdDeductions.netRetentionWithheld,
          tds_deducted: pwdDeductions.itTdsAmount,
          gst_tds_deducted: pwdDeductions.gstTdsAmount,
          labour_cess_deducted: pwdDeductions.labourCessAmount,
          other_deductions: safeAdd(pwdDeductions.departmentalRecoveries.total, pwdDeductions.royaltyRecovery, pwdDeductions.mobilizationAdvanceRecovery, pwdDeductions.withheldAmount),
          total_deductions: pwdDeductions.totalAllDeductions,
          it_tds_percentage: pwdDeductions.itTdsEffectivePercent,
          it_tds_amount: pwdDeductions.itTdsAmount,
          gst_tds_percentage: pwdDeductions.gstTdsEffectivePercent,
          gst_tds_amount: pwdDeductions.gstTdsAmount,
          labour_cess_percentage: pwdDeductions.labourCessEffectivePercent,
          labour_cess_amount: pwdDeductions.labourCessAmount,
          royalty_recovery: pwdDeductions.royaltyRecovery,
          mobilization_advance_recovery: pwdDeductions.mobilizationAdvanceRecovery,
          withheld_amount: pwdDeductions.withheldAmount,
          deductions_breakdown: deductionsBreakdown,
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
        }

        if (documentUrl) {
          updatePayload.document_url = documentUrl
        }

        const { error: err } = await supabase
          .from('ra_bills')
          .update(updatePayload)
          .eq('id', editBill.id)

        if (err) {
          const { userMessage } = translateError(err)
          setError(userMessage)
          setSaving(false)
          return
        }

        // If Item-Wise mode, sync ra_bill_items
        if (entryMode === 'item_wise' && editBill.id) {
          await supabase.from('ra_bill_items').delete().eq('ra_bill_id', editBill.id)

          const itemsToInsert = boqItems
            .map((b) => {
              const entered = itemMeasurements[b.boq_item_id]
              const currQty = parseFloat(entered?.currentQty || '0') || 0
              const prevQty = Number(b.cumulative_executed_qty) || 0
              return {
                ra_bill_id: editBill.id,
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
              console.warn('Failed to update e-MB ra_bill_items:', itemsErr.message)
            }
          }
        }

        // Synchronize itemized deductions to public.bill_deductions
        try {
          await supabase.from('bill_deductions').delete().eq('bill_id', editBill.id).is('payment_id', null)
          const dedRows = [
            { bill_id: editBill.id, ra_bill_id: editBill.id, deduction_label: `Security Deposit / Retention (${retentionMode === 'percent' ? retentionPctNum : 'Custom'}%)`, deduction_amount: pwdDeductions.netRetentionWithheld },
            { bill_id: editBill.id, ra_bill_id: editBill.id, deduction_label: `Income Tax TDS u/s 194C (${pwdDeductions.itTdsEffectivePercent}%)`, deduction_amount: pwdDeductions.itTdsAmount },
            { bill_id: editBill.id, ra_bill_id: editBill.id, deduction_label: `GST-TDS Section 51 (${pwdDeductions.gstTdsEffectivePercent}%)`, deduction_amount: pwdDeductions.gstTdsAmount },
            { bill_id: editBill.id, ra_bill_id: editBill.id, deduction_label: `BOCW Labour Welfare Cess (${pwdDeductions.labourCessEffectivePercent}%)`, deduction_amount: pwdDeductions.labourCessAmount },
            ...(pwdDeductions.departmentalRecoveries.cement > 0 ? [{ bill_id: editBill.id, ra_bill_id: editBill.id, deduction_label: 'Cement Recovery (Item 8a Form 35-A)', deduction_amount: pwdDeductions.departmentalRecoveries.cement }] : []),
            ...(pwdDeductions.departmentalRecoveries.steel > 0 ? [{ bill_id: editBill.id, ra_bill_id: editBill.id, deduction_label: 'Steel Recovery (Item 8a Form 35-A)', deduction_amount: pwdDeductions.departmentalRecoveries.steel }] : []),
            ...(pwdDeductions.departmentalRecoveries.other > 0 ? [{ bill_id: editBill.id, ra_bill_id: editBill.id, deduction_label: 'Other Material / Plant Recovery', deduction_amount: pwdDeductions.departmentalRecoveries.other }] : []),
            ...(pwdDeductions.royaltyRecovery > 0 ? [{ bill_id: editBill.id, ra_bill_id: editBill.id, deduction_label: 'Royalty / Minor Mineral Recovery', deduction_amount: pwdDeductions.royaltyRecovery }] : []),
            ...(pwdDeductions.mobilizationAdvanceRecovery > 0 ? [{ bill_id: editBill.id, ra_bill_id: editBill.id, deduction_label: 'Mobilization / Secured Advance Recovery', deduction_amount: pwdDeductions.mobilizationAdvanceRecovery }] : []),
            ...(pwdDeductions.withheldAmount > 0 ? [{ bill_id: editBill.id, ra_bill_id: editBill.id, deduction_label: 'Temporary Withheld Amount (EOT / QC)', deduction_amount: pwdDeductions.withheldAmount }] : []),
          ].filter(r => r.deduction_amount > 0)
          if (dedRows.length > 0) {
            await supabase.from('bill_deductions').insert(dedRows)
          }
        } catch (syncErr) {
          console.warn('Could not sync bill_deductions:', syncErr)
        }

        const savedBillNumber = billForm.bill_number.trim()
        setSaving(false)
        onClose()
        toast.success(`RA Bill "${savedBillNumber}" updated successfully`)
        if (onSuccess) onSuccess({ id: editBill.id, ...updatePayload })
        router.refresh()
        return
      }

      const insertDeductionsBreakdown = {
        retention_mode: retentionMode,
        retention_percentage: retentionMode === 'percent' ? retentionPctNum : (certifiedNum > 0 ? Number(((pwdDeductions.grossRetentionRequired / certifiedNum) * 100).toFixed(2)) : 5),
        retention_custom_amount: parseFloat(retentionCustomAmount) || 0,
        gross_retention: pwdDeductions.grossRetentionRequired,
        bg_offset_applied: pwdDeductions.bgOffsetApplied,
        net_retention: pwdDeductions.netRetentionWithheld,
        it_tds_mode: itTdsMode,
        it_tds_percentage: pwdDeductions.itTdsEffectivePercent,
        it_tds_amount: pwdDeductions.itTdsAmount,
        gst_tds_mode: gstTdsMode,
        gst_tds_percentage: pwdDeductions.gstTdsEffectivePercent,
        gst_tds_amount: pwdDeductions.gstTdsAmount,
        labour_cess_mode: labourCessMode,
        labour_cess_percentage: pwdDeductions.labourCessEffectivePercent,
        labour_cess_amount: pwdDeductions.labourCessAmount,
        cement_recovery: cementRecNum,
        steel_recovery: steelRecNum,
        other_material_recovery: otherMatRecNum,
        departmental_recoveries_total: pwdDeductions.departmentalRecoveries.total,
        royalty_recovery: pwdDeductions.royaltyRecovery,
        mobilization_advance_recovery: pwdDeductions.mobilizationAdvanceRecovery,
        withheld_amount: pwdDeductions.withheldAmount,
        total_statutory_taxes: pwdDeductions.totalStatutoryTaxes,
        total_departmental_recoveries: pwdDeductions.departmentalRecoveries.total,
        total_other_recoveries: pwdDeductions.totalOtherRecoveries,
        total_all_deductions: pwdDeductions.totalAllDeductions,
        gross_work_certified: pwdDeductions.grossWorkCertified,
        net_payable: pwdDeductions.netPayableAmount,
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
          net_payable_this_bill: pwdDeductions.netPayableAmount,
          work_certified_amount: certifiedNum,
          retention_percentage: retentionMode === 'percent' ? retentionPctNum : (certifiedNum > 0 ? Number(((pwdDeductions.grossRetentionRequired / certifiedNum) * 100).toFixed(2)) : 5),
          retention_amount: pwdDeductions.netRetentionWithheld,
          bg_offset_amount: pwdDeductions.bgOffsetApplied,
          bg_applied_id: pwdDeductions.bgOffsetApplied > 0 ? (selectedBg?.id || null) : null,
          gross_retention_required: pwdDeductions.grossRetentionRequired,
          net_retention_withheld: pwdDeductions.netRetentionWithheld,
          tds_deducted: pwdDeductions.itTdsAmount,
          gst_tds_deducted: pwdDeductions.gstTdsAmount,
          labour_cess_deducted: pwdDeductions.labourCessAmount,
          other_deductions: safeAdd(pwdDeductions.departmentalRecoveries.total, pwdDeductions.royaltyRecovery, pwdDeductions.mobilizationAdvanceRecovery, pwdDeductions.withheldAmount),
          total_deductions: pwdDeductions.totalAllDeductions,
          it_tds_percentage: pwdDeductions.itTdsEffectivePercent,
          it_tds_amount: pwdDeductions.itTdsAmount,
          gst_tds_percentage: pwdDeductions.gstTdsEffectivePercent,
          gst_tds_amount: pwdDeductions.gstTdsAmount,
          labour_cess_percentage: pwdDeductions.labourCessEffectivePercent,
          labour_cess_amount: pwdDeductions.labourCessAmount,
          royalty_recovery: pwdDeductions.royaltyRecovery,
          mobilization_advance_recovery: pwdDeductions.mobilizationAdvanceRecovery,
          withheld_amount: pwdDeductions.withheldAmount,
          deductions_breakdown: insertDeductionsBreakdown,
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

      // Synchronize itemized deductions to public.bill_deductions
      if (createdBill?.id) {
        try {
          const dedRows = [
            { bill_id: createdBill.id, ra_bill_id: createdBill.id, deduction_label: `Security Deposit / Retention (${retentionMode === 'percent' ? retentionPctNum : 'Custom'}%)`, deduction_amount: pwdDeductions.netRetentionWithheld },
            { bill_id: createdBill.id, ra_bill_id: createdBill.id, deduction_label: `Income Tax TDS u/s 194C (${pwdDeductions.itTdsEffectivePercent}%)`, deduction_amount: pwdDeductions.itTdsAmount },
            { bill_id: createdBill.id, ra_bill_id: createdBill.id, deduction_label: `GST-TDS Section 51 (${pwdDeductions.gstTdsEffectivePercent}%)`, deduction_amount: pwdDeductions.gstTdsAmount },
            { bill_id: createdBill.id, ra_bill_id: createdBill.id, deduction_label: `BOCW Labour Welfare Cess (${pwdDeductions.labourCessEffectivePercent}%)`, deduction_amount: pwdDeductions.labourCessAmount },
            ...(pwdDeductions.departmentalRecoveries.cement > 0 ? [{ bill_id: createdBill.id, ra_bill_id: createdBill.id, deduction_label: 'Cement Recovery (Item 8a Form 35-A)', deduction_amount: pwdDeductions.departmentalRecoveries.cement }] : []),
            ...(pwdDeductions.departmentalRecoveries.steel > 0 ? [{ bill_id: createdBill.id, ra_bill_id: createdBill.id, deduction_label: 'Steel Recovery (Item 8a Form 35-A)', deduction_amount: pwdDeductions.departmentalRecoveries.steel }] : []),
            ...(pwdDeductions.departmentalRecoveries.other > 0 ? [{ bill_id: createdBill.id, ra_bill_id: createdBill.id, deduction_label: 'Other Material / Plant Recovery', deduction_amount: pwdDeductions.departmentalRecoveries.other }] : []),
            ...(pwdDeductions.royaltyRecovery > 0 ? [{ bill_id: createdBill.id, ra_bill_id: createdBill.id, deduction_label: 'Royalty / Minor Mineral Recovery', deduction_amount: pwdDeductions.royaltyRecovery }] : []),
            ...(pwdDeductions.mobilizationAdvanceRecovery > 0 ? [{ bill_id: createdBill.id, ra_bill_id: createdBill.id, deduction_label: 'Mobilization / Secured Advance Recovery', deduction_amount: pwdDeductions.mobilizationAdvanceRecovery }] : []),
            ...(pwdDeductions.withheldAmount > 0 ? [{ bill_id: createdBill.id, ra_bill_id: createdBill.id, deduction_label: 'Temporary Withheld Amount (EOT / QC)', deduction_amount: pwdDeductions.withheldAmount }] : []),
          ].filter(r => r.deduction_amount > 0)
          if (dedRows.length > 0) {
            await supabase.from('bill_deductions').insert(dedRows)
          }
        } catch (syncErr) {
          console.warn('Could not sync bill_deductions:', syncErr)
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
      if (onSuccess) onSuccess(createdBill)
      router.refresh()
    } catch (err: any) {
      setSaving(false)
      const { userMessage } = translateError(err, editBill ? 'Failed to update RA bill.' : 'Failed to submit RA bill.')
      setError(userMessage)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={editBill ? `Edit RA Bill — ${editBill.bill_number}` : 'Submit Government RA Bill'}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" loading={saving || uploading} onClick={handleSave}>
            {uploading
              ? 'Uploading Attachment...'
              : editBill
              ? (saving ? 'Saving Changes...' : 'Save Changes')
              : (saving ? 'Submitting...' : 'Submit RA Bill')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

        {!editBill && onTriggerScan && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-sm shadow-sm">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
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
                <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
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
                Retention Release Scheduled For:{' '}
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
                .filter(b => b.project_id === billForm.project_id && (!editBill || b.id !== editBill.id))
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
              <svg className="w-3.5 h-3.5 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
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
        <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Security Deposit / Retention (CPWA Item 5)</span>
            </label>
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setRetentionMode('percent')}
                className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors ${
                  retentionMode === 'percent'
                    ? 'bg-slate-900 text-white font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                % Mode
              </button>
              <button
                type="button"
                onClick={() => setRetentionMode('amount')}
                className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors ${
                  retentionMode === 'amount'
                    ? 'bg-slate-900 text-white font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ₹ Flat Amount
              </button>
            </div>
          </div>

          {retentionMode === 'percent' ? (
            <div>
              <div className="flex items-center justify-end gap-1 mb-1.5">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FieldWrapper label="Retention (%)" required hint="Contractual security deposit percentage">
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

                <FieldWrapper
                  label="Net Cash Withheld (₹)"
                  hint={bgOffsetAmount > 0 ? `Gross ₹${grossRetention.toLocaleString('en-IN')} - BG ₹${bgOffsetAmount.toLocaleString('en-IN')}` : 'Auto-computed from certified work'}
                >
                  <div className="h-10 px-3 flex items-center rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-800">
                    {formatINR(liveRetentionAmount)}
                  </div>
                </FieldWrapper>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldWrapper label="Custom Retention Withheld (₹)" required hint="Direct rupee amount withheld per contract">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={retentionCustomAmount}
                  onChange={e => setRetentionCustomAmount(e.target.value)}
                  placeholder="e.g. 50000"
                />
              </FieldWrapper>
              <FieldWrapper label="Effective Retention Rate" hint="Computed against certified work">
                <div className="h-10 px-3 flex items-center rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-700">
                  {certifiedNum > 0 ? ((parseFloat(retentionCustomAmount) || 0) / certifiedNum * 100).toFixed(2) : '0.00'}%
                </div>
              </FieldWrapper>
            </div>
          )}

          {/* CPWD GCC Clause 1A Bank Guarantee Offset Card */}
          {activeDeposits.length > 0 && (
            <div className="mt-2 p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-emerald-950">
                  <input
                    type="checkbox"
                    checked={applyBgOffset}
                    onChange={e => setApplyBgOffset(e.target.checked)}
                    className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span>Offset Cash Retention with Bank Guarantee (CPWD GCC Clause 1A)</span>
                </label>
                {bgOffsetAmount > 0 && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    Shield: {formatINR(bgOffsetAmount)}
                  </span>
                )}
              </div>

              {applyBgOffset && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-emerald-200/60">
                  <div>
                    <label className="block text-[11px] font-medium text-emerald-900 mb-1">
                      Submitted BG / Security Deposit
                    </label>
                    <select
                      value={selectedBgId}
                      onChange={e => setSelectedBgId(e.target.value)}
                      className="w-full text-xs rounded-lg border-emerald-300 bg-white py-1.5 px-2 text-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    >
                      {activeDeposits.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.reference_number} ({formatINR(d.amount)}) {d.issuing_bank ? `- ${d.issuing_bank}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="text-[11px] text-emerald-800 flex flex-col justify-center bg-white/70 p-2 rounded-lg border border-emerald-100">
                    <div className="flex justify-between">
                      <span>Gross Required:</span>
                      <span className="font-semibold">{formatINR(grossRetention)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>BG Offset Applied:</span>
                      <span>-{formatINR(bgOffsetAmount)}</span>
                    </div>
                    <div className="flex justify-between border-t border-emerald-200 pt-0.5 mt-0.5 font-bold">
                      <span>Cash Deducted:</span>
                      <span className={netRetentionWithheld === 0 ? 'text-emerald-700' : 'text-slate-800'}>
                        {netRetentionWithheld === 0 ? '₹0 (100% Protected Working Capital)' : formatINR(netRetentionWithheld)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CPWA Code Departmental Store Recoveries (Form 26 Item 2 & 8a) */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>Departmental Store Recoveries & Advances</span>
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

          {pwdDeductions.departmentalRecoveries.total > 0 && (
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
              <span className="font-medium">Total Departmental Recoveries (Form 35-A):</span>
              <span className="font-bold text-amber-800 font-mono">-{formatINR(pwdDeductions.departmentalRecoveries.total)}</span>
            </div>
          )}
        </div>

        {/* Full Indian Government PWD/CPWD Statutory Deductions (Form 26 Item 8b) */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-indigo-100">
            <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Statutory Taxes & Other Recoveries (Form 26 Item 8b)</span>
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 self-start sm:self-auto">
              CPWD / PWD Clause Standards
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Income Tax TDS u/s 194C */}
            <div className="p-3 bg-white rounded-lg border border-indigo-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">Income Tax TDS u/s 194C</span>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 font-mono">
                  -{formatINR(pwdDeductions.itTdsAmount)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-100 rounded-lg text-[10px]">
                <button
                  type="button"
                  onClick={() => setItTdsMode('1_percent')}
                  className={`py-1 px-1.5 rounded transition-colors text-center truncate ${
                    itTdsMode === '1_percent' ? 'bg-indigo-700 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  1% Prop / Ind
                </button>
                <button
                  type="button"
                  onClick={() => setItTdsMode('2_percent')}
                  className={`py-1 px-1.5 rounded transition-colors text-center truncate ${
                    itTdsMode === '2_percent' ? 'bg-indigo-700 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  2% Firm / Co
                </button>
                <button
                  type="button"
                  onClick={() => setItTdsMode('custom_amount')}
                  className={`py-1 px-1.5 rounded transition-colors text-center truncate ${
                    itTdsMode === 'custom_amount' ? 'bg-indigo-700 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Custom ₹
                </button>
              </div>
              {itTdsMode === 'custom_amount' && (
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={itTdsCustomAmount}
                  onChange={e => setItTdsCustomAmount(e.target.value)}
                  placeholder="Custom TDS ₹"
                  className="mt-1"
                />
              )}
            </div>

            {/* GST-TDS Section 51 */}
            <div className="p-3 bg-white rounded-lg border border-indigo-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">GST-TDS (1% CGST + 1% SGST)</span>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 font-mono">
                  -{formatINR(pwdDeductions.gstTdsAmount)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-100 rounded-lg text-[10px]">
                <button
                  type="button"
                  onClick={() => setGstTdsMode('percent')}
                  className={`py-1 px-1.5 rounded transition-colors text-center truncate ${
                    gstTdsMode === 'percent' ? 'bg-indigo-700 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  2% Standard
                </button>
                <button
                  type="button"
                  onClick={() => setGstTdsMode('amount')}
                  className={`py-1 px-1.5 rounded transition-colors text-center truncate ${
                    gstTdsMode === 'amount' ? 'bg-indigo-700 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Custom ₹
                </button>
              </div>
              {gstTdsMode === 'amount' ? (
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={gstTdsCustomAmount}
                  onChange={e => setGstTdsCustomAmount(e.target.value)}
                  placeholder="Custom GST-TDS ₹"
                  className="mt-1"
                />
              ) : (
                <div className="text-[10px] text-slate-500 flex justify-between pt-0.5">
                  <span>CGST 1%: {formatINR(pwdDeductions.gstTdsAmount / 2)}</span>
                  <span>SGST 1%: {formatINR(pwdDeductions.gstTdsAmount / 2)}</span>
                </div>
              )}
            </div>

            {/* BOCW Labour Welfare Cess */}
            <div className="p-3 bg-white rounded-lg border border-indigo-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">BOCW Labour Cess (1%)</span>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 font-mono">
                  -{formatINR(pwdDeductions.labourCessAmount)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-100 rounded-lg text-[10px]">
                <button
                  type="button"
                  onClick={() => setLabourCessMode('percent')}
                  className={`py-1 px-1.5 rounded transition-colors text-center truncate ${
                    labourCessMode === 'percent' ? 'bg-indigo-700 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  1% Act 1996
                </button>
                <button
                  type="button"
                  onClick={() => setLabourCessMode('amount')}
                  className={`py-1 px-1.5 rounded transition-colors text-center truncate ${
                    labourCessMode === 'amount' ? 'bg-indigo-700 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Custom ₹
                </button>
              </div>
              {labourCessMode === 'amount' && (
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={labourCessCustomAmount}
                  onChange={e => setLabourCessCustomAmount(e.target.value)}
                  placeholder="Custom Labour Cess ₹"
                  className="mt-1"
                />
              )}
            </div>

            {/* Royalty / Minor Mineral Recovery */}
            <div className="p-3 bg-white rounded-lg border border-indigo-100 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">Royalty / Mineral Recovery</span>
                {parseFloat(royaltyRecovery) > 0 && (
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-mono">
                    -{formatINR(parseFloat(royaltyRecovery) || 0)}
                  </span>
                )}
              </div>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={royaltyRecovery}
                onChange={e => setRoyaltyRecovery(e.target.value)}
                placeholder="₹ Sand/stone/gravel royalty"
              />
              <span className="text-[10px] text-slate-400 block">Mining & geology minor mineral transit royalty</span>
            </div>

            {/* Mobilization Advance Recovery */}
            <div className="p-3 bg-white rounded-lg border border-indigo-100 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">Mobilization Advance Recovery</span>
                {parseFloat(mobilizationAdvanceRecovery) > 0 && (
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-mono">
                    -{formatINR(parseFloat(mobilizationAdvanceRecovery) || 0)}
                  </span>
                )}
              </div>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={mobilizationAdvanceRecovery}
                onChange={e => setMobilizationAdvanceRecovery(e.target.value)}
                placeholder="₹ Clause 10B recovery"
              />
              <span className="text-[10px] text-slate-400 block">Deduction towards initial mobilization advance</span>
            </div>

            {/* Temporary Departmental Withheld Amount */}
            <div className="p-3 bg-white rounded-lg border border-indigo-100 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">Temporary Withheld (EOT / QC)</span>
                {parseFloat(withheldAmount) > 0 && (
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded font-mono">
                    -{formatINR(parseFloat(withheldAmount) || 0)}
                  </span>
                )}
              </div>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={withheldAmount}
                onChange={e => setWithheldAmount(e.target.value)}
                placeholder="₹ Milestone or sanction hold"
              />
              <span className="text-[10px] text-slate-400 block">Hold for pending EOT approval or QC test report</span>
            </div>
          </div>
        </div>

        {/* Dynamic Official Form 26 Deduction Breakdown (Account III) */}
        <div className="rounded-xl border border-blue-200 bg-gradient-to-b from-blue-50/70 to-slate-50/90 p-4 text-xs space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between border-b border-blue-200/80 pb-2">
            <span className="font-bold text-blue-950 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-blue-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>Form 26 Deduction Breakdown (Account III)</span>
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
              CPWD Form 26 Official
            </span>
          </div>

          <div className="space-y-1.5 text-slate-700 pt-0.5">
            {/* Item 1 */}
            <div className="flex justify-between items-center py-0.5">
              <span>Item 1: Gross Work Certified (A):</span>
              <span className="font-mono font-bold text-slate-900">{formatINR(pwdDeductions.grossWorkCertified)}</span>
            </div>

            {/* Unmeasured Advance */}
            {unmeasuredAdvNum > 0 && (
              <div className="flex justify-between items-center text-emerald-700">
                <span>&nbsp;&nbsp;↳ Item 2: Advance for Unmeasured Work:</span>
                <span className="font-mono font-semibold">+{formatINR(unmeasuredAdvNum)}</span>
              </div>
            )}

            {/* Cumulative previous work */}
            {isCumulative && prevCertified > 0 && (
              <div className="flex justify-between items-center text-slate-500">
                <span>&nbsp;&nbsp;↳ Less Previous Certified Work:</span>
                <span className="font-mono">-{formatINR(prevCertified)}</span>
              </div>
            )}
            {isCumulative && (
              <div className="flex justify-between items-center text-blue-900 font-semibold bg-blue-100/40 px-2 py-1 rounded">
                <span>Current Bill Work Certified:</span>
                <span className="font-mono">{formatINR(thisBillCertified)}</span>
              </div>
            )}

            {/* Item 5: Retention */}
            <div className="flex justify-between items-center text-amber-800">
              <span className="flex items-center gap-1">
                <span>Item 5: Less Retention / Security Deposit Withheld:</span>
                {bgOffsetAmount > 0 && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1 rounded">
                    BG Shielded {formatINR(bgOffsetAmount)}
                  </span>
                )}
              </span>
              <span className="font-mono font-semibold text-rose-700">-{formatINR(pwdDeductions.netRetentionWithheld)}</span>
            </div>

            {/* Item 8a: Departmental recoveries */}
            {pwdDeductions.departmentalRecoveries.total > 0 && (
              <div className="flex justify-between items-center text-amber-800">
                <span>Item 8(a): Less Departmental Recoveries (Cement/Steel/Plant):</span>
                <span className="font-mono font-semibold text-rose-700">-{formatINR(pwdDeductions.departmentalRecoveries.total)}</span>
              </div>
            )}

            {/* Item 8a: Mobilization Advance Recovery */}
            {pwdDeductions.mobilizationAdvanceRecovery > 0 && (
              <div className="flex justify-between items-center text-amber-800">
                <span>Item 8(a): Less Mobilization Advance Recovery:</span>
                <span className="font-mono font-semibold text-rose-700">-{formatINR(pwdDeductions.mobilizationAdvanceRecovery)}</span>
              </div>
            )}

            {/* Item 8b: IT TDS */}
            <div className="flex justify-between items-center text-slate-600">
              <span>Item 8(b): Less Income Tax TDS u/s 194C ({pwdDeductions.itTdsEffectivePercent}%):</span>
              <span className="font-mono font-semibold text-rose-700">-{formatINR(pwdDeductions.itTdsAmount)}</span>
            </div>

            {/* Item 8b: GST TDS */}
            <div className="flex justify-between items-center text-slate-600">
              <span>Item 8(b): Less GST-TDS Section 51 ({pwdDeductions.gstTdsEffectivePercent}%):</span>
              <span className="font-mono font-semibold text-rose-700">-{formatINR(pwdDeductions.gstTdsAmount)}</span>
            </div>

            {/* Item 8b: Labour Cess */}
            <div className="flex justify-between items-center text-slate-600">
              <span>Item 8(b): Less BOCW Labour Welfare Cess ({pwdDeductions.labourCessEffectivePercent}%):</span>
              <span className="font-mono font-semibold text-rose-700">-{formatINR(pwdDeductions.labourCessAmount)}</span>
            </div>

            {/* Item 8b: Royalty */}
            {pwdDeductions.royaltyRecovery > 0 && (
              <div className="flex justify-between items-center text-slate-600">
                <span>Item 8(b): Less Mineral Royalty Recovery:</span>
                <span className="font-mono font-semibold text-rose-700">-{formatINR(pwdDeductions.royaltyRecovery)}</span>
              </div>
            )}

            {/* Item 8b: Temporary Withheld */}
            {pwdDeductions.withheldAmount > 0 && (
              <div className="flex justify-between items-center text-rose-700">
                <span>Item 8(b): Less Temporary Withheld (EOT / QC):</span>
                <span className="font-mono font-semibold text-rose-700">-{formatINR(pwdDeductions.withheldAmount)}</span>
              </div>
            )}

            {/* Item 7: Prior payments in cumulative mode */}
            {isCumulative && prevReceived > 0 && (
              <div className="flex justify-between items-center text-slate-600">
                <span>Item 7: Less Payments Already Made (Last Bill):</span>
                <span className="font-mono font-semibold text-rose-700">-{formatINR(prevReceived)}</span>
              </div>
            )}
          </div>

          {/* Subtotal Deductions (B) */}
          <div className="flex justify-between items-center p-2 rounded-lg bg-rose-50/80 border border-rose-200 text-rose-900 font-semibold">
            <span>Total Statutory & Departmental Deductions (B):</span>
            <span className="font-mono font-bold text-rose-700 text-sm">-{formatINR(pwdDeductions.totalAllDeductions)}</span>
          </div>

          {/* Net Payable (Passed for Payment) (A - B) */}
          <div className="flex justify-between items-center p-3 rounded-xl bg-blue-600 text-white shadow-sm mt-1">
            <div>
              <span className="block font-bold text-sm tracking-tight">Net Payable (Passed for Payment / Cheque)</span>
              <span className="text-[11px] text-blue-100 font-sans">Formula: Gross (A) - Total Deductions (B)</span>
            </div>
            <div className="text-right">
              <span className="font-mono font-black text-xl text-white block tracking-tight">
                {formatINR(pwdDeductions.netPayableAmount)}
              </span>
              <span className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">
                PFMS / RTGS Treasury Release
              </span>
            </div>
          </div>
        </div>

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

