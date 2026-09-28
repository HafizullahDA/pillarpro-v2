'use client'

import { useState, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { formatINR, formatDate } from '@/lib/format'
import { createClient } from '@/lib/supabase/client'
import { BOQItem } from '@/lib/types/boq'
import { MeasurementEntry } from '@/lib/types/measurement'
import {
  calculateBOQBillingBreakdown,
  validateBillingAgainstCertified,
} from '@/lib/calculations/measurementBilling'
import {
  calculateStatutoryDeductions,
  calculateRABillNetPayable,
} from '@/lib/calculations/raBill'
import { safeMul, safeAdd } from '@/lib/calculations/financial'
import { ProjectOption, RABillOption } from '@/app/(app)/ra-bills/RABillActions'

interface BillPreparationWizardProps {
  open: boolean
  onClose: () => void
  projects: ProjectOption[]
  defaultProjectId?: string
  allBOQItems: BOQItem[]
  allMeasurements: MeasurementEntry[]
  existingBills: any[]
  onSuccess: (newBill: any) => void
}

type WizardStep = 'step1_select_bill' | 'step2_select_measurements' | 'step3_system_calculates' | 'step4_review_create'

export function BillPreparationWizard({
  open,
  onClose,
  projects,
  defaultProjectId,
  allBOQItems,
  allMeasurements,
  existingBills,
  onSuccess,
}: BillPreparationWizardProps) {
  const supabase = createClient()
  const toast = useToast()
  const [loading, setLoading] = useState(false)

  // Wizard Step State
  const [step, setStep] = useState<WizardStep>('step1_select_bill')

  // Step 1: Bill Setup
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    defaultProjectId || projects[0]?.id || ''
  )
  const [billNumber, setBillNumber] = useState(`RA-BILL-${Date.now().toString().slice(-4)}`)
  const [billType, setBillType] = useState<'running' | 'first_and_final' | 'final'>('running')
  const [submissionDate, setSubmissionDate] = useState(new Date().toISOString().split('T')[0])
  const [retentionPercent, setRetentionPercent] = useState('5.00')

  // Step 2: Selected Measurement Entries
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set())

  // Step 3 & 4: Overridden custom bill quantities per BOQ item if needed
  const [customBillQuantities, setCustomBillQuantities] = useState<Record<string, number>>({})

  // Filtered project context
  const currentProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || projects[0]
  }, [projects, selectedProjectId])

  const projectBOQ = useMemo(() => {
    return allBOQItems.filter(b => b.project_id === selectedProjectId)
  }, [allBOQItems, selectedProjectId])

  const projectMeasurements = useMemo(() => {
    return allMeasurements.filter(m => m.project_id === selectedProjectId)
  }, [allMeasurements, selectedProjectId])

  // Certified unbilled measurements available for billing
  const availableCertifiedEntries = useMemo(() => {
    return projectMeasurements.filter(
      m => m.status === 'CERTIFIED' && !m.billed_in_ra_bill_id
    )
  }, [projectMeasurements])

  // Auto-select all available certified measurements by default
  const handleSelectAllCertified = () => {
    const ids = new Set(availableCertifiedEntries.map(e => e.id))
    setSelectedEntryIds(ids)
  }

  const handleToggleEntry = (id: string) => {
    setSelectedEntryIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Calculate previously billed quantities for each BOQ item from existing bills
  const previouslyBilledMap = useMemo(() => {
    const map = new Map<string, number>()
    // Sum across existing bills for this project
    for (const b of projectBOQ) {
      map.set(b.id, Number((b as any).billed_quantity || 0))
    }
    return map
  }, [projectBOQ])

  // System Calculated Quantities for every BOQ Item
  const calculatedBreakdowns = useMemo(() => {
    return projectBOQ.map(boq => {
      const prevBilled = previouslyBilledMap.get(boq.id) || 0

      // If user selected specific measurement entries for this item:
      const selectedItemEntries = availableCertifiedEntries.filter(
        e => e.boq_item_id === boq.id && selectedEntryIds.has(e.id)
      )
      const selectedQtySum = selectedItemEntries.reduce(
        (sum, e) => sum + Number(e.calculated_quantity || 0),
        0
      )

      // Use selectedQtySum or custom quantity
      const billQty = customBillQuantities[boq.id] !== undefined
        ? customBillQuantities[boq.id]
        : selectedQtySum

      return calculateBOQBillingBreakdown({
        boqItem: boq,
        allMeasurements: projectMeasurements,
        previouslyBilledQuantity: prevBilled,
        currentBillQuantity: billQty,
      })
    })
  }, [
    projectBOQ,
    projectMeasurements,
    availableCertifiedEntries,
    selectedEntryIds,
    customBillQuantities,
    previouslyBilledMap,
  ])

  // Total gross bill amount calculated from current bill quantities
  const totalWorkCertified = useMemo(() => {
    return calculatedBreakdowns.reduce((sum, b) => sum + b.current_amount, 0)
  }, [calculatedBreakdowns])

  // Statutory deductions preview
  const deductions = useMemo(() => {
    return calculateStatutoryDeductions(totalWorkCertified, {
      retentionPercent: parseFloat(retentionPercent) || 5,
      contractorType: 'company_firm',
    })
  }, [totalWorkCertified, retentionPercent])

  const netPayable = useMemo(() => {
    return calculateRABillNetPayable({
      workCertified: totalWorkCertified,
      totalDeductions: deductions.totalDeductions,
    })
  }, [totalWorkCertified, deductions])

  // Create Bill Handler
  const handleCreateBill = async () => {
    // 1. Validate all breakdowns
    for (const b of calculatedBreakdowns) {
      if (b.current_bill_qty > 0) {
        const val = validateBillingAgainstCertified(b)
        if (!val.isValid) {
          toast.showToast(val.errorMessage || 'Invalid billing quantity.', 'error')
          return
        }
      }
    }

    if (totalWorkCertified <= 0) {
      toast.showToast('Please select at least one certified measurement entry to bill.', 'error')
      return
    }

    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // Fetch org id
      const { data: projData } = await supabase
        .from('projects')
        .select('organization_id')
        .eq('id', selectedProjectId)
        .single()

      if (!projData?.organization_id) throw new Error('Project organization not found')

      // 1. Insert ra_bill
      const { data: billData, error: billErr } = await supabase
        .from('ra_bills')
        .insert({
          organization_id: projData.organization_id,
          project_id: selectedProjectId,
          bill_number: billNumber.trim(),
          bill_type: billType,
          billing_mode: 'standalone',
          billing_entry_mode: 'item_wise',
          submission_date: submissionDate,
          work_certified_amount: totalWorkCertified,
          this_bill_work_certified: totalWorkCertified,
          retention_percentage: parseFloat(retentionPercent) || 5,
          retention_amount: deductions.retention,
          net_payable_amount: netPayable,
          net_payable_this_bill: netPayable,
          tds_deducted: deductions.itTds,
          gst_tds_deducted: deductions.gstTds,
          labour_cess_deducted: deductions.labourCess,
          total_deductions: deductions.totalDeductions,
          outstanding_balance: netPayable,
          status: 'submitted',
          remarks: `Generated via Bill Preparation from e-MB Certified Measurements (${selectedEntryIds.size} entries linked)`,
          created_by: user?.id,
        })
        .select()
        .single()

      if (billErr) throw billErr

      // 2. Insert ra_bill_items for items with current_bill_qty > 0
      const activeItems = calculatedBreakdowns.filter(b => b.current_bill_qty > 0)

      for (const item of activeItems) {
        const { data: billItemData, error: itemErr } = await supabase
          .from('ra_bill_items')
          .insert({
            organization_id: projData.organization_id,
            ra_bill_id: billData.id,
            boq_item_id: item.boq_item_id,
            previous_quantity: item.previously_billed_qty,
            current_quantity: item.current_bill_qty,
            rate: item.contract_rate,
            remarks: 'Billed from certified e-MB measurements',
          })
          .select()
          .single()

        if (itemErr) {
          console.warn('Warning inserting ra_bill_item:', itemErr)
        }

        // 3. Link measurement entries to this ra_bill_item in ra_bill_measurement_entries
        const matchedEntries = availableCertifiedEntries.filter(
          e => e.boq_item_id === item.boq_item_id && selectedEntryIds.has(e.id)
        )

        for (const entry of matchedEntries) {
          await supabase.from('ra_bill_measurement_entries').insert({
            organization_id: projData.organization_id,
            ra_bill_id: billData.id,
            ra_bill_item_id: billItemData?.id || null,
            boq_item_id: item.boq_item_id,
            measurement_entry_id: entry.id,
            billed_quantity: Number(entry.calculated_quantity),
          })
        }
      }

      // 4. Update measurement_entries to link billed_in_ra_bill_id
      if (selectedEntryIds.size > 0) {
        await supabase
          .from('measurement_entries')
          .update({ billed_in_ra_bill_id: billData.id })
          .in('id', Array.from(selectedEntryIds))
      }

      toast.showToast(`RA Bill ${billNumber} successfully prepared and created from certified measurements!`, 'success')
      onSuccess(billData)
      onClose()
    } catch (err: any) {
      console.error('Failed to create RA bill from measurements:', err)
      toast.showToast(err.message || 'Failed to prepare RA Bill.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bill Preparation — Intake from Certified Measurements (e-MB)"
    >
      <div className="space-y-4 text-xs max-h-[82vh] overflow-y-auto pr-1">
        {/* Step Indicator Header */}
        <div className="grid grid-cols-4 gap-2 text-center pb-2 border-b border-slate-200">
          {[
            { id: 'step1_select_bill', label: '1. Select Bill' },
            { id: 'step2_select_measurements', label: '2. Select Measurements' },
            { id: 'step3_system_calculates', label: '3. System Calculates' },
            { id: 'step4_review_create', label: '4. Review & Create' },
          ].map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(s.id as WizardStep)}
              className={`p-2 rounded-xl text-xs font-bold transition-all ${
                step === s.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* STEP 1: SELECT RA BILL & PROJECT */}
        {step === 'step1_select_bill' && (
          <div className="space-y-4">
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-indigo-950">
              <p className="font-bold">Step 1: Set Up Running Account Bill</p>
              <p className="text-[11px] text-indigo-900/80 mt-0.5">
                Select the project and configure the bill parameters. The system will pull all verified, certified e-MB measurements for this work.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Project *</label>
                <select
                  value={selectedProjectId}
                  onChange={e => {
                    setSelectedProjectId(e.target.value)
                    setSelectedEntryIds(new Set())
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="RA Bill Number *"
                value={billNumber}
                onChange={e => setBillNumber(e.target.value)}
                placeholder="e.g. RA-03/PWD/2026"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bill Type</label>
                <select
                  value={billType}
                  onChange={e => setBillType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
                >
                  <option value="running">Running Account Bill (Form 26)</option>
                  <option value="first_and_final">First &amp; Final Bill (Form 24)</option>
                  <option value="final">Final Bill (Form 27-B Yellow Paper)</option>
                </select>
              </div>
              <Input
                label="Submission Date *"
                type="date"
                value={submissionDate}
                onChange={e => setSubmissionDate(e.target.value)}
                required
              />
              <Input
                label="Retention Money (% withheld)"
                type="number"
                step="0.1"
                value={retentionPercent}
                onChange={e => setRetentionPercent(e.target.value)}
                required
              />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800">Available Certified Measurements:</span>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  {availableCertifiedEntries.length} unbilled certified records ready for billing
                </p>
              </div>
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  handleSelectAllCertified()
                  setStep('step2_select_measurements')
                }}
              >
                Proceed to Select Measurements &rarr;
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: SELECT MEASUREMENTS */}
        {step === 'step2_select_measurements' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
              <div>
                <h4 className="font-bold text-slate-900">Select Certified Measurements to Include</h4>
                <p className="text-[11px] text-slate-500">
                  Select the e-MB records to bill. Only entries certified by the Executive Engineer (EE) can be billed.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={handleSelectAllCertified}>
                  Select All ({availableCertifiedEntries.length})
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setSelectedEntryIds(new Set())}>
                  Deselect All
                </Button>
              </div>
            </div>

            {availableCertifiedEntries.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
                No unbilled certified measurements found for this project. Please record and certify measurements in the Measurement module first.
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {projectBOQ.map(boq => {
                  const boqEntries = availableCertifiedEntries.filter(e => e.boq_item_id === boq.id)
                  if (boqEntries.length === 0) return null

                  const itemSelectedCount = boqEntries.filter(e => selectedEntryIds.has(e.id)).length

                  return (
                    <div key={boq.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <div className="bg-slate-50 p-2.5 border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={itemSelectedCount === boqEntries.length}
                            onChange={() => {
                              const next = new Set(selectedEntryIds)
                              if (itemSelectedCount === boqEntries.length) {
                                boqEntries.forEach(e => next.delete(e.id))
                              } else {
                                boqEntries.forEach(e => next.add(e.id))
                              }
                              setSelectedEntryIds(next)
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-mono font-bold text-slate-900">Item {boq.item_number}:</span>
                          <span className="font-medium text-slate-800">{boq.description.slice(0, 50)}...</span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500 font-medium">
                          {itemSelectedCount}/{boqEntries.length} entries selected
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100 bg-white">
                        {boqEntries.map(e => {
                          const isSelected = selectedEntryIds.has(e.id)
                          return (
                            <div
                              key={e.id}
                              onClick={() => handleToggleEntry(e.id)}
                              className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                                isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleEntry(e.id)}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <div>
                                  <span className="font-mono font-bold text-slate-800">{e.entry_number}</span>
                                  <span className="text-slate-500 text-[11px] ml-2">
                                    Date: {formatDate(e.measurement_date)} {e.location && `• ${e.location}`}
                                  </span>
                                  <p className="text-[11px] text-slate-600 mt-0.5">{e.description}</p>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="font-mono font-bold text-slate-900 block">
                                  {e.calculated_quantity} {e.unit}
                                </span>
                                <span className="text-[10px] text-emerald-700 font-semibold">
                                  {e.certified_by || 'EE Certified'}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex justify-between pt-2 border-t border-slate-200">
              <Button type="button" variant="secondary" onClick={() => setStep('step1_select_bill')}>
                &larr; Back
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => setStep('step3_system_calculates')}
                disabled={selectedEntryIds.size === 0}
              >
                Calculate Quantities &rarr;
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: SYSTEM CALCULATES QUANTITIES */}
        {step === 'step3_system_calculates' && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-950">
              <p className="font-bold">Step 3: System Automated Quantity Breakdown</p>
              <p className="text-[11px] text-emerald-900/80 mt-0.5">
                The system has aggregated certified quantities and applied previous bill records. Verify the 7-column quantity chain below.
              </p>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Item</th>
                      <th className="p-2.5 text-right">BOQ Qty</th>
                      <th className="p-2.5 text-right">Measured</th>
                      <th className="p-2.5 text-right">Certified</th>
                      <th className="p-2.5 text-right">Prev Billed</th>
                      <th className="p-2.5 text-right text-indigo-700">Current Bill Qty</th>
                      <th className="p-2.5 text-right">Cum Billed</th>
                      <th className="p-2.5 text-right">Balance</th>
                      <th className="p-2.5 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {calculatedBreakdowns.map(item => (
                      <tr
                        key={item.boq_item_id}
                        className={`hover:bg-slate-50 ${item.current_bill_qty > 0 ? 'bg-indigo-50/20' : ''}`}
                      >
                        <td className="p-2.5">
                          <span className="font-mono font-bold text-slate-900 block">{item.item_number}</span>
                          <span className="text-[10px] text-slate-500">{item.description.slice(0, 30)}...</span>
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-600">{item.boq_quantity}</td>
                        <td className="p-2.5 text-right font-mono text-slate-600">{item.measured_quantity}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-700">{item.certified_quantity}</td>
                        <td className="p-2.5 text-right font-mono text-slate-600">{item.previously_billed_qty}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-indigo-700">
                          {item.current_bill_qty}
                        </td>
                        <td className="p-2.5 text-right font-mono font-semibold text-slate-800">
                          {item.cumulative_billed_qty}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                          {item.balance_quantity}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                          {formatINR(item.current_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                    <tr>
                      <td colSpan={8} className="p-2.5 text-right uppercase">Total Work Certified for this Bill:</td>
                      <td className="p-2.5 text-right font-mono text-indigo-900">{formatINR(totalWorkCertified)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="flex justify-between pt-2 border-t border-slate-200">
              <Button type="button" variant="secondary" onClick={() => setStep('step2_select_measurements')}>
                &larr; Back
              </Button>
              <Button type="button" variant="primary" onClick={() => setStep('step4_review_create')}>
                Review &amp; Statutory Deductions &rarr;
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW & CREATE BILL */}
        {step === 'step4_review_create' && (
          <div className="space-y-4">
            <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block uppercase font-bold tracking-wider">Bill Preparation Summary</span>
                  <h3 className="text-lg font-bold">{billNumber} — {currentProject.name}</h3>
                </div>
                <Badge label="CPWD FORM 26" variant="success" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block">Gross Work Certified:</span>
                  <span className="font-mono font-bold text-white text-sm">{formatINR(totalWorkCertified)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Retention Withheld ({retentionPercent}%):</span>
                  <span className="font-mono font-bold text-amber-400">{formatINR(deductions.retention)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Statutory Taxes (TDS/Cess):</span>
                  <span className="font-mono font-bold text-rose-400">
                    {formatINR(deductions.itTds + deductions.gstTds + deductions.labourCess)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Net Payable to Contractor:</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">{formatINR(netPayable)}</span>
                </div>
              </div>
            </div>

            {/* Audit & Compliance Confirmation */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1">
              <p className="font-bold">Permanent Traceability Assurance:</p>
              <p>
                By creating this bill, {selectedEntryIds.size} certified measurement entries will be permanently linked to {billNumber}.
                Supporting measurements will be visible directly on bill line items and audited against CPWD standards.
              </p>
            </div>

            <div className="flex justify-between pt-2 border-t border-slate-200">
              <Button type="button" variant="secondary" onClick={() => setStep('step3_system_calculates')}>
                &larr; Back
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleCreateBill}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {loading ? 'Creating Bill & Linking Measurements...' : 'Create & Submit RA Bill'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
