'use client'

import { useState, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DateInput } from '@/components/ui/DateInput'
import { useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import { BOQItem } from '@/lib/types/boq'
import {
  CalculationMode,
  CALCULATION_MODES,
  STANDARD_REBAR_DIAMETERS,
  DeviationOrderType,
  MeasurementBook,
  MeasurementEntry,
  MeasurementSubRow,
} from '@/lib/types/measurement'
import {
  calculateMeasurementQuantity,
  validateQuantityAgainstBOQ,
} from '@/lib/calculations/measurement'

interface NewMeasurementEntryModalProps {
  open: boolean
  onClose: () => void
  projectId: string
  contractId?: string | null
  measurementBooks: MeasurementBook[]
  boqItems: BOQItem[]
  existingEntries: MeasurementEntry[]
  onSuccess: (entry: MeasurementEntry) => void
}

interface MeasurementRowState {
  id: string
  particulars: string
  mode: 'add' | 'deduct'
  nos: string
  barsPerMember: string
  barDiameterMm: string
  unitWeightKgPerM: string
  length: string
  breadth: string
  depthHeight: string
  manualQuantity: string
}

function createDefaultRow(mode: 'add' | 'deduct' = 'add', defaultDia = '16'): MeasurementRowState {
  const diaNum = parseFloat(defaultDia) || 16
  const std = STANDARD_REBAR_DIAMETERS.find(d => d.diameter === diaNum)
  const unitWt = std ? std.unitWeightKgPerM : Number((Math.pow(diaNum, 2) / 162.28).toFixed(3))
  return {
    id: `row_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    particulars: '',
    mode,
    nos: '1',
    barsPerMember: '1',
    barDiameterMm: defaultDia,
    unitWeightKgPerM: unitWt.toString(),
    length: '',
    breadth: '',
    depthHeight: '',
    manualQuantity: '',
  }
}

export function NewMeasurementEntryModal({
  open,
  onClose,
  projectId,
  contractId,
  measurementBooks,
  boqItems,
  existingEntries,
  onSuccess,
}: NewMeasurementEntryModalProps) {
  const supabase = createClient()
  const toast = useToast()
  const [loading, setLoading] = useState(false)

  // Form State
  const [selectedBookId, setSelectedBookId] = useState(measurementBooks[0]?.id || '')
  const [selectedBOQId, setSelectedBOQId] = useState(boqItems[0]?.id || '')
  const [entryNumber, setEntryNumber] = useState(`MB-ENTRY-${Date.now().toString().slice(-5)}`)
  const [pageNumber, setPageNumber] = useState('1')
  const [measurementDate, setMeasurementDate] = useState(new Date().toISOString().split('T')[0])
  const [location, setLocation] = useState('')
  const [chainageKm, setChainageKm] = useState('')
  const [chainageM, setChainageM] = useState('')
  const [description, setDescription] = useState('')

  // Dimensions & Multi-Row Grid
  const [calculationMode, setCalculationMode] = useState<CalculationMode>('l_b_d')
  const [rows, setRows] = useState<MeasurementRowState[]>([createDefaultRow('add')])

  // Statutory & Extras
  const [remarks, setRemarks] = useState('')
  const [siteReference, setSiteReference] = useState('')
  const [drawingReference, setDrawingReference] = useState('')
  const [enteredBy, setEnteredBy] = useState('')
  const [deviationOrderType, setDeviationOrderType] = useState<DeviationOrderType>('none')
  const [status, setStatus] = useState<'DRAFT' | 'SUBMITTED' | 'CHECKED'>('SUBMITTED')

  // Selected BOQ & Balance Calculation
  const activeBOQ = useMemo(() => {
    return boqItems.find(b => b.id === selectedBOQId)
  }, [boqItems, selectedBOQId])

  // Multi-Row Computations
  const computedRows = useMemo(() => {
    return rows.map(r => {
      const qty = calculateMeasurementQuantity({
        calculationMode,
        numberOfUnits: parseFloat(r.nos) || 1,
        barsPerMember: parseFloat(r.barsPerMember) || 1,
        length: parseFloat(r.length) || 0,
        breadth: parseFloat(r.breadth) || 0,
        depthHeight: parseFloat(r.depthHeight) || 0,
        manualQuantity: parseFloat(r.manualQuantity) || 0,
        rebarDiameterMm: parseFloat(r.barDiameterMm) || 0,
        unitWeightKgPerM: parseFloat(r.unitWeightKgPerM) || 0,
        boqUnit: activeBOQ?.unit,
      })
      return {
        ...r,
        quantity: qty,
      }
    })
  }, [rows, calculationMode, activeBOQ?.unit])

  const { totalAdd, totalDeduct, netCalculatedQty } = useMemo(() => {
    let add = 0
    let deduct = 0
    for (const r of computedRows) {
      if (r.mode === 'deduct') {
        deduct += r.quantity
      } else {
        add += r.quantity
      }
    }
    const roundedAdd = Number(add.toFixed(3))
    const roundedDeduct = Number(deduct.toFixed(3))
    const net = Number(Math.max(0, roundedAdd - roundedDeduct).toFixed(3))
    return {
      totalAdd: roundedAdd,
      totalDeduct: roundedDeduct,
      netCalculatedQty: net,
    }
  }, [computedRows])

  const calculatedQty = netCalculatedQty

  // Compute previous quantity for this BOQ item across existing entries
  const previousQuantity = useMemo(() => {
    if (!selectedBOQId) return 0
    return existingEntries
      .filter(e => e.boq_item_id === selectedBOQId && e.status !== 'REJECTED' && e.status !== 'CANCELLED')
      .reduce((sum, e) => sum + Number(e.calculated_quantity || 0), 0)
  }, [existingEntries, selectedBOQId])

  const boqValidation = useMemo(() => {
    const contractQty = Number(activeBOQ?.revised_quantity ?? (activeBOQ as any)?.contract_quantity ?? activeBOQ?.tender_quantity ?? 0)
    return validateQuantityAgainstBOQ({
      contractQuantity: contractQty,
      previousQuantity,
      currentQuantity: calculatedQty,
    })
  }, [activeBOQ, previousQuantity, calculatedQty])

  // Multi-Row Actions
  const handleAddRow = (mode: 'add' | 'deduct' = 'add') => {
    setRows(prev => [...prev, createDefaultRow(mode)])
  }

  const handleRemoveRow = (id: string) => {
    setRows(prev => {
      if (prev.length <= 1) {
        return [createDefaultRow('add')]
      }
      return prev.filter(r => r.id !== id)
    })
  }

  const handleToggleMode = (id: string) => {
    setRows(prev =>
      prev.map(r => {
        if (r.id !== id) return r
        return {
          ...r,
          mode: r.mode === 'add' ? 'deduct' : 'add',
        }
      })
    )
  }

  const handleUpdateRow = (id: string, field: keyof MeasurementRowState, value: string) => {
    setRows(prev =>
      prev.map(r => {
        if (r.id !== id) return r
        const updated = { ...r, [field]: value }
        if (field === 'barDiameterMm') {
          const diaNum = parseFloat(value) || 0
          if (diaNum > 0) {
            const std = STANDARD_REBAR_DIAMETERS.find(d => d.diameter === diaNum)
            updated.unitWeightKgPerM = std
              ? std.unitWeightKgPerM.toString()
              : (Math.pow(diaNum, 2) / 162.28).toFixed(3)
          }
        }
        return updated
      })
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBOQId || !description.trim()) {
      toast.showToast('Please select a BOQ item and provide entry description.', 'error')
      return
    }

    if (calculatedQty <= 0) {
      toast.showToast(
        'Calculated measurement quantity must be greater than zero. Please enter dimensions or check deductions.',
        'error'
      )
      return
    }

    if (boqValidation.isExceeded && deviationOrderType === 'none') {
      toast.showToast(
        'Measured quantity exceeds contractual BOQ limit. You must select an official Deviation, Variation, or Extra Item classification.',
        'error',
      )
      return
    }

    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data: projectData } = await supabase
        .from('projects')
        .select('organization_id')
        .eq('id', projectId)
        .single()

      if (!projectData?.organization_id) throw new Error('Project organization not found')

      // Build structured sub-rows JSON
      const measurementRowsData: MeasurementSubRow[] = computedRows.map(r => ({
        id: r.id,
        particulars: r.particulars.trim(),
        mode: r.mode,
        nos: parseFloat(r.nos) || 1,
        barsPerMember: ['steel_bbs'].includes(calculationMode) ? parseFloat(r.barsPerMember) || 1 : null,
        barDiameterMm: ['steel_bbs', 'weight'].includes(calculationMode) ? parseFloat(r.barDiameterMm) || null : null,
        unitWeightKgPerM: ['steel_bbs'].includes(calculationMode) ? parseFloat(r.unitWeightKgPerM) || null : null,
        length: parseFloat(r.length) || null,
        breadth: ['l_b_d', 'l_b', 'num_l_b_h'].includes(calculationMode) ? parseFloat(r.breadth) || null : null,
        depthHeight: ['l_b_d', 'l_h', 'num_l_b_h'].includes(calculationMode) ? parseFloat(r.depthHeight) || null : null,
        manualQuantity: calculationMode === 'manual' ? parseFloat(r.manualQuantity) || null : null,
        quantity: r.quantity,
      }))

      const primaryRow = measurementRowsData[0]

      const payload: any = {
        organization_id: projectData.organization_id,
        project_id: projectId,
        contract_id: contractId || null,
        measurement_book_id: selectedBookId || null,
        boq_item_id: selectedBOQId,
        entry_number: entryNumber.trim(),
        page_number: parseInt(pageNumber, 10) || 1,
        measurement_date: measurementDate,
        location: location.trim() || primaryRow?.particulars || null,
        chainage_km: chainageKm ? parseFloat(chainageKm) : null,
        chainage_m: chainageM ? parseFloat(chainageM) : null,
        description: description.trim(),
        calculation_mode: calculationMode,
        number_of_units: primaryRow?.nos ?? 1,
        length: primaryRow?.length ?? 0,
        breadth: primaryRow?.breadth ?? 0,
        depth_height: primaryRow?.depthHeight ?? 0,
        calculated_quantity: calculatedQty,
        measurement_rows: measurementRowsData,
        unit: activeBOQ?.unit || 'Nos',
        previous_quantity: previousQuantity,
        current_quantity: calculatedQty,
        cumulative_quantity: boqValidation.cumulativeQuantity,
        boq_balance_quantity: boqValidation.balanceQuantity,
        is_exceeded: boqValidation.isExceeded,
        deviation_order_type: boqValidation.isExceeded ? deviationOrderType : null,
        remarks: remarks.trim() || null,
        site_reference: siteReference.trim() || null,
        drawing_reference: drawingReference.trim() || null,
        entered_by: enteredBy.trim() || user?.email || 'Site Engineer',
        status,
        created_by: user?.id,
      }

      let { data, error } = await supabase
        .from('measurement_entries')
        .insert(payload)
        .select('*, boq_items:boq_item_id(*)')
        .single()

      // Schema migration fallback: if measurement_rows column is not present yet or calculation_mode check fails
      if (error && (error.message?.includes('measurement_rows') || error.message?.includes('calculation_mode'))) {
        console.warn('Retrying insert with compatibility fallback:', error.message)
        const fallbackPayload = { ...payload }
        if (error.message?.includes('measurement_rows')) {
          delete fallbackPayload.measurement_rows
        }
        if (error.message?.includes('calculation_mode') && fallbackPayload.calculation_mode === 'steel_bbs') {
          fallbackPayload.calculation_mode = 'weight'
        }
        const retryRes = await supabase
          .from('measurement_entries')
          .insert(fallbackPayload)
          .select('*, boq_items:boq_item_id(*)')
          .single()
        data = retryRes.data
        error = retryRes.error
      }

      if (error) throw error

      toast.showToast(`Measurement entry ${entryNumber} saved successfully.`, 'success')
      onSuccess(data as MeasurementEntry)
      onClose()
    } catch (err: any) {
      console.error('Failed to create measurement entry:', err)
      toast.showToast(err.message || 'Failed to save measurement entry.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record Measurement Entry (e-MB Detail Sheet)"
      maxWidth="5xl"
      bodyClassName="p-0 flex flex-col flex-1 min-h-0 overflow-hidden"
    >
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Scrollable Form Body */}
        <div className="space-y-4 text-xs overflow-y-auto flex-1 p-4 sm:p-5 pr-3 sm:pr-4">
          {/* BOQ Item & e-MB Header */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select BOQ Item *
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                value={selectedBOQId}
                onChange={e => setSelectedBOQId(e.target.value)}
                required
              >
                {boqItems.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.item_number} — {item.description.slice(0, 60)}... ({item.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Measurement Book (e-MB)
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                value={selectedBookId}
                onChange={e => setSelectedBookId(e.target.value)}
              >
                <option value="">-- No Specific Book (General) --</option>
                {measurementBooks.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.book_number}: {b.title} (Page {b.current_page}/{b.total_pages})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* BOQ Live Quantity Balance Strip */}
          {activeBOQ && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">Contract Qty</span>
                  <span className="text-xs font-bold font-mono text-slate-800">
                    {activeBOQ.revised_quantity ?? (activeBOQ as any).contract_quantity ?? activeBOQ.tender_quantity} {activeBOQ.unit}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">Previously Measured</span>
                  <span className="text-xs font-bold font-mono text-blue-700">
                    {previousQuantity} {activeBOQ.unit}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">Current Entry (Net)</span>
                  <span className="text-xs font-bold font-mono text-indigo-700">
                    {calculatedQty} {activeBOQ.unit}
                  </span>
                </div>
                <div
                  className={`p-2 rounded-lg border ${
                    boqValidation.isExceeded
                      ? 'bg-rose-50 border-rose-300 text-rose-900'
                      : 'bg-white border-slate-200 text-emerald-800'
                  }`}
                >
                  <span className="text-[10px] block uppercase font-medium">
                    {boqValidation.isExceeded ? 'Excess Overrun' : 'Balance Qty'}
                  </span>
                  <span className="text-xs font-bold font-mono">
                    {boqValidation.balanceQuantity} {activeBOQ.unit}
                  </span>
                </div>
              </div>

              {/* Overrun Warning */}
              {boqValidation.isExceeded && (
                <div className="mt-2.5 p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px] flex items-center justify-between">
                  <span>
                    <strong>CRITICAL WARNING:</strong> Cumulative quantity ({boqValidation.cumulativeQuantity} {activeBOQ.unit}) exceeds contractual quantity by {boqValidation.exceededBy} {activeBOQ.unit}!
                  </span>
                  <span className="text-[10px] uppercase font-bold text-rose-700">Clause Violation</span>
                </div>
              )}
            </div>
          )}

          {/* Overrun Statutory Deviation Selector */}
          {boqValidation.isExceeded && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-amber-900">
                Contractual Deviation / Variation Classification Required *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { type: 'deviation', label: 'Deviation (Qty Overrun)' },
                  { type: 'variation', label: 'Variation Order' },
                  { type: 'extra_item', label: 'Extra Item Order' },
                ].map(opt => (
                  <button
                    type="button"
                    key={opt.type}
                    onClick={() => setDeviationOrderType(opt.type as DeviationOrderType)}
                    className={`p-2 rounded-lg border text-left text-xs font-medium transition-all ${
                      deviationOrderType === opt.type
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-amber-100/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Entry Identification */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input
              label="Entry Number *"
              value={entryNumber}
              onChange={e => setEntryNumber(e.target.value)}
              required
            />
            <Input
              label="Page Number"
              type="number"
              value={pageNumber}
              onChange={e => setPageNumber(e.target.value)}
            />
            <DateInput
              label="Measurement Date *"
              value={measurementDate}
              onChange={setMeasurementDate}
              required
            />
            <Input
              label="General Location / Structure"
              placeholder="e.g. Pier P2 / Abutment A1"
              value={location}
              onChange={e => setLocation(e.target.value)}
            />
          </div>

          {/* Chainage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Chainage Km"
              placeholder="e.g. 14"
              type="number"
              step="0.001"
              value={chainageKm}
              onChange={e => setChainageKm(e.target.value)}
            />
            <Input
              label="Chainage Metre (+m)"
              placeholder="e.g. 250"
              type="number"
              step="0.1"
              value={chainageM}
              onChange={e => setChainageM(e.target.value)}
            />
          </div>

          {/* Calculation Mode Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Standard Method of Measurement / Formula *
            </label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
              value={calculationMode}
              onChange={e => setCalculationMode(e.target.value as CalculationMode)}
            >
              {CALCULATION_MODES.map(mode => (
                <option key={mode.value} value={mode.value}>
                  {mode.label} [{mode.formula}]
                </option>
              ))}
            </select>
          </div>

          {/* MULTI-ROW DIMENSION GRID */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 shadow-xs">
            {/* Grid Header & Quick Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-100/90 border-b border-slate-200">
              <div>
                <h4 className="font-semibold text-xs text-slate-800">
                  Measurement Dimension Grid &amp; Deductions (e-MB Multi-Row)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Add dimension rows under this item. Use <span className="font-semibold text-rose-700">- Deduct</span> for door/window voids or pipe deductions.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddRow('add')}
                  className="bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-300 text-xs py-1 h-8"
                >
                  + Add Measurement Row
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddRow('deduct')}
                  className="bg-white hover:bg-rose-50 text-rose-700 border-rose-300 text-xs py-1 h-8"
                >
                  - Add Deduction Row
                </Button>
              </div>
            </div>

            {/* Dimension Rows Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-200/80 text-slate-700 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-300">
                    <th className="p-2 w-16 text-center">Mode</th>
                    <th className="p-2 min-w-[180px]">Particulars / Location / Description</th>
                    {calculationMode === 'steel_bbs' ? (
                      <>
                        <th className="p-2 w-20 text-center">Nos (Members)</th>
                        <th className="p-2 w-20 text-center">Bars / Mbr</th>
                        <th className="p-2 w-24 text-center">Length (m)</th>
                        <th className="p-2 w-28 text-center">Bar Dia (mm)</th>
                        <th className="p-2 w-24 text-center">Unit Wt (kg/m)</th>
                      </>
                    ) : calculationMode === 'manual' ? (
                      <th className="p-2 w-32 text-center">Direct Quantity</th>
                    ) : (
                      <>
                        <th className="p-2 w-20 text-center">Nos</th>
                        <th className="p-2 w-24 text-center">Length (L) m</th>
                        {['l_b_d', 'l_b', 'num_l_b_h'].includes(calculationMode) && (
                          <th className="p-2 w-24 text-center">Breadth (B) m</th>
                        )}
                        {['l_b_d', 'l_h', 'num_l_b_h'].includes(calculationMode) && (
                          <th className="p-2 w-24 text-center">Depth / H (m)</th>
                        )}
                        {calculationMode === 'weight' && (
                          <th className="p-2 w-28 text-center">Bar Dia (mm)</th>
                        )}
                      </>
                    )}
                    <th className="p-2 w-28 text-right">Row Qty ({activeBOQ?.unit || 'Units'})</th>
                    <th className="p-2 w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono">
                  {computedRows.map((row, idx) => {
                    const isDeduct = row.mode === 'deduct'
                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors ${
                          isDeduct
                            ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                            : 'bg-white hover:bg-slate-50/70'
                        }`}
                      >
                        {/* Mode Toggle Button */}
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleMode(row.id)}
                            title="Click to toggle between Addition (+) and Deduction (-)"
                            className={`w-full py-1 px-1.5 rounded-md text-[11px] font-bold tracking-tight transition-all border ${
                              isDeduct
                                ? 'bg-rose-200/90 text-rose-900 border-rose-300 hover:bg-rose-300'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                            }`}
                          >
                            {isDeduct ? '- Deduct' : '+ Add'}
                          </button>
                        </td>

                        {/* Particulars / Location */}
                        <td className="p-2 font-sans">
                          <input
                            type="text"
                            value={row.particulars}
                            onChange={e => handleUpdateRow(row.id, 'particulars', e.target.value)}
                            placeholder={
                              isDeduct
                                ? `e.g. Deduction for Door D1 / Opening`
                                : `e.g. Footing F${idx + 1} / Grid A-B / Span 1`
                            }
                            className={`w-full px-2.5 py-1.5 text-xs rounded-md border focus:outline-none focus:ring-1 ${
                              isDeduct
                                ? 'border-rose-300 bg-white text-rose-950 focus:ring-rose-400'
                                : 'border-slate-300 bg-white text-slate-800 focus:ring-blue-500'
                            }`}
                          />
                        </td>

                        {/* Steel BBS Mode Inputs */}
                        {calculationMode === 'steel_bbs' ? (
                          <>
                            <td className="p-2">
                              <input
                                type="number"
                                step="1"
                                min="0"
                                value={row.nos}
                                onChange={e => handleUpdateRow(row.id, 'nos', e.target.value)}
                                className="w-full px-2 py-1.5 text-xs text-center rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="1"
                                min="0"
                                value={row.barsPerMember}
                                onChange={e => handleUpdateRow(row.id, 'barsPerMember', e.target.value)}
                                className="w-full px-2 py-1.5 text-xs text-center rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.001"
                                min="0"
                                placeholder="0.000"
                                value={row.length}
                                onChange={e => handleUpdateRow(row.id, 'length', e.target.value)}
                                className="w-full px-2 py-1.5 text-xs text-right rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="p-2">
                              <select
                                value={row.barDiameterMm}
                                onChange={e => handleUpdateRow(row.id, 'barDiameterMm', e.target.value)}
                                className="w-full px-1.5 py-1.5 text-xs rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                {STANDARD_REBAR_DIAMETERS.map(d => (
                                  <option key={d.diameter} value={d.diameter.toString()}>
                                    {d.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.001"
                                value={row.unitWeightKgPerM}
                                onChange={e => handleUpdateRow(row.id, 'unitWeightKgPerM', e.target.value)}
                                title="Auto-filled from D²/162.28 kg/m. Editable if required."
                                className="w-full px-2 py-1.5 text-xs text-right rounded-md border border-slate-300 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                          </>
                        ) : calculationMode === 'manual' ? (
                          <td className="p-2">
                            <input
                              type="number"
                              step="0.001"
                              value={row.manualQuantity}
                              onChange={e => handleUpdateRow(row.id, 'manualQuantity', e.target.value)}
                              placeholder="0.000"
                              className="w-full px-2 py-1.5 text-xs text-right rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                        ) : (
                          <>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.01"
                                value={row.nos}
                                onChange={e => handleUpdateRow(row.id, 'nos', e.target.value)}
                                className="w-full px-2 py-1.5 text-xs text-center rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.001"
                                placeholder="0.000"
                                value={row.length}
                                onChange={e => handleUpdateRow(row.id, 'length', e.target.value)}
                                className="w-full px-2 py-1.5 text-xs text-right rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            {['l_b_d', 'l_b', 'num_l_b_h'].includes(calculationMode) && (
                              <td className="p-2">
                                <input
                                  type="number"
                                  step="0.001"
                                  placeholder="0.000"
                                  value={row.breadth}
                                  onChange={e => handleUpdateRow(row.id, 'breadth', e.target.value)}
                                  className="w-full px-2 py-1.5 text-xs text-right rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </td>
                            )}
                            {['l_b_d', 'l_h', 'num_l_b_h'].includes(calculationMode) && (
                              <td className="p-2">
                                <input
                                  type="number"
                                  step="0.001"
                                  placeholder="0.000"
                                  value={row.depthHeight}
                                  onChange={e => handleUpdateRow(row.id, 'depthHeight', e.target.value)}
                                  className="w-full px-2 py-1.5 text-xs text-right rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </td>
                            )}
                            {calculationMode === 'weight' && (
                              <td className="p-2">
                                <input
                                  type="number"
                                  step="1"
                                  placeholder="16"
                                  value={row.barDiameterMm}
                                  onChange={e => handleUpdateRow(row.id, 'barDiameterMm', e.target.value)}
                                  className="w-full px-2 py-1.5 text-xs text-center rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </td>
                            )}
                          </>
                        )}

                        {/* Calculated Row Quantity */}
                        <td className="p-2 text-right">
                          <span
                            className={`font-bold ${
                              isDeduct ? 'text-rose-700' : 'text-slate-800'
                            }`}
                          >
                            {isDeduct ? '-' : '+'} {row.quantity.toFixed(3)}
                          </span>
                        </td>

                        {/* Delete Row Action */}
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            title="Remove row"
                            className="text-slate-400 hover:text-rose-600 transition-colors p-1 rounded font-bold text-sm"
                          >
                            &times;
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Summary Strip */}
            <div className="p-3 bg-white border-t border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Total Additions (+)</span>
                    <span className="font-mono font-bold text-emerald-700 text-sm">
                      + {totalAdd} {activeBOQ?.unit || 'Units'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Total Deductions (-)</span>
                    <span className="font-mono font-bold text-rose-700 text-sm">
                      - {totalDeduct} {activeBOQ?.unit || 'Units'}
                    </span>
                  </div>
                  {calculationMode === 'steel_bbs' && (
                    <div className="hidden sm:block text-[11px] text-slate-500 border-l pl-4 border-slate-200">
                      Standard Formula: <span className="font-mono font-semibold">Nos × Bars × L × (D²/162.28)</span>
                      {activeBOQ?.unit && ['mt', 'tonne', 'ton', 'metric tonne'].includes(activeBOQ.unit.toLowerCase()) && (
                        <span className="block text-indigo-600 font-semibold text-[10px]">
                          ✓ Auto-converted from Kg to Metric Tonnes (÷ 1,000)
                        </span>
                      )}
                      {activeBOQ?.unit && ['qtl', 'quintal'].includes(activeBOQ.unit.toLowerCase()) && (
                        <span className="block text-indigo-600 font-semibold text-[10px]">
                          ✓ Auto-converted from Kg to Quintals (÷ 100)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-slate-100 border border-slate-300 rounded-xl px-4 py-2 text-right">
                  <span className="text-[10px] font-bold text-slate-600 block uppercase tracking-wide">
                    Net Calculated Quantity
                  </span>
                  <span className="text-lg font-bold font-mono text-blue-700">
                    {netCalculatedQty} {activeBOQ?.unit || 'Units'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Measurement Particulars / Description *
            </label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="Detailed description of component measured, structural elements, grid lines, or stage of work..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
            />
          </div>

          {/* Remarks, References & Status */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input
              label="Drawing / Level Sheet Ref"
              placeholder="e.g. DWG-STR-104 / Level Sheet #3"
              value={drawingReference}
              onChange={e => setDrawingReference(e.target.value)}
            />
            <Input
              label="Site Order / RFI Ref"
              placeholder="e.g. RFI/CONC/2026/042"
              value={siteReference}
              onChange={e => setSiteReference(e.target.value)}
            />
            <Input
              label="Remarks / Notes"
              placeholder="e.g. Inspected with Consultant"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
            />
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Entry Status</label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                value={status}
                onChange={e => setStatus(e.target.value as any)}
              >
                <option value="DRAFT">Draft (Under Preparation)</option>
                <option value="SUBMITTED">Submitted for Inspection</option>
                <option value="CHECKED">Checked by Field Eng (AE)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 px-5 flex justify-end gap-2 z-10 shrink-0 shadow-xs">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Recording Measurement...' : 'Record in e-MB'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
