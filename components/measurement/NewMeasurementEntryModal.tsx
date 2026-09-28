'use client'

import { useState, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import { BOQItem } from '@/lib/types/boq'
import {
  CalculationMode,
  CALCULATION_MODES,
  DeviationOrderType,
  MeasurementBook,
  MeasurementEntry,
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

  // Dimensions & Calc
  const [calculationMode, setCalculationMode] = useState<CalculationMode>('l_b_d')
  const [numberOfUnits, setNumberOfUnits] = useState('1')
  const [length, setLength] = useState('')
  const [breadth, setBreadth] = useState('')
  const [depthHeight, setDepthHeight] = useState('')
  const [manualQuantity, setManualQuantity] = useState('')
  const [rebarDiameter, setRebarDiameter] = useState('16')

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

  const calculatedQty = useMemo(() => {
    return calculateMeasurementQuantity({
      calculationMode,
      numberOfUnits: parseFloat(numberOfUnits) || 1,
      length: parseFloat(length) || 0,
      breadth: parseFloat(breadth) || 0,
      depthHeight: parseFloat(depthHeight) || 0,
      manualQuantity: parseFloat(manualQuantity) || 0,
      rebarDiameterMm: parseFloat(rebarDiameter) || 0,
    })
  }, [calculationMode, numberOfUnits, length, breadth, depthHeight, manualQuantity, rebarDiameter])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBOQId || !description.trim()) {
      toast.showToast('Please select a BOQ item and provide entry description.', 'error')
      return
    }

    if (calculatedQty <= 0) {
      toast.showToast('Calculated measurement quantity must be greater than zero.', 'error')
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

      const { data, error } = await supabase
        .from('measurement_entries')
        .insert({
          organization_id: projectData.organization_id,
          project_id: projectId,
          contract_id: contractId || null,
          measurement_book_id: selectedBookId || null,
          boq_item_id: selectedBOQId,
          entry_number: entryNumber.trim(),
          page_number: parseInt(pageNumber, 10) || 1,
          measurement_date: measurementDate,
          location: location.trim() || null,
          chainage_km: chainageKm ? parseFloat(chainageKm) : null,
          chainage_m: chainageM ? parseFloat(chainageM) : null,
          description: description.trim(),
          calculation_mode: calculationMode,
          number_of_units: parseFloat(numberOfUnits) || 1,
          length: parseFloat(length) || 0,
          breadth: parseFloat(breadth) || 0,
          depth_height: parseFloat(depthHeight) || 0,
          calculated_quantity: calculatedQty,
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
        })
        .select('*, boq_items:boq_item_id(*)')
        .single()

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
    <Modal open={open} onClose={onClose} title="Record Measurement Entry (e-MB Detail Sheet)">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs max-h-[80vh] overflow-y-auto pr-1">
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
                  {item.item_number} — {item.description.slice(0, 50)}... ({item.unit})
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
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Current Entry</span>
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
          <Input
            label="Measurement Date *"
            type="date"
            value={measurementDate}
            onChange={e => setMeasurementDate(e.target.value)}
            required
          />
          <Input
            label="Location / Structure"
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

        {/* Formula Dimensions */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
          {calculationMode === 'manual' ? (
            <Input
              label="Direct Quantity Entry *"
              type="number"
              step="0.001"
              value={manualQuantity}
              onChange={e => setManualQuantity(e.target.value)}
              placeholder="Enter measured quantity directly..."
              required
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Input
                label="Number (Nos)"
                type="number"
                step="0.01"
                value={numberOfUnits}
                onChange={e => setNumberOfUnits(e.target.value)}
              />
              <Input
                label="Length (L) m"
                type="number"
                step="0.001"
                value={length}
                onChange={e => setLength(e.target.value)}
              />
              {['l_b_d', 'l_b', 'num_l_b_h'].includes(calculationMode) && (
                <Input
                  label="Breadth (B) m"
                  type="number"
                  step="0.001"
                  value={breadth}
                  onChange={e => setBreadth(e.target.value)}
                />
              )}
              {['l_b_d', 'l_h', 'num_l_b_h'].includes(calculationMode) && (
                <Input
                  label="Depth / Height (D/H) m"
                  type="number"
                  step="0.001"
                  value={depthHeight}
                  onChange={e => setDepthHeight(e.target.value)}
                />
              )}
              {calculationMode === 'weight' && (
                <Input
                  label="Rebar Dia (mm)"
                  type="number"
                  value={rebarDiameter}
                  onChange={e => setRebarDiameter(e.target.value)}
                  placeholder="e.g. 16, 20, 25, 32"
                />
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <span className="text-xs text-slate-500 font-medium">Calculated Quantity:</span>
            <span className="text-base font-bold font-mono text-blue-700">
              {calculatedQty} {activeBOQ?.unit || 'Units'}
            </span>
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
            placeholder="Detailed description of component measured, grid lines, structural element..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
          />
        </div>

        {/* References & Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
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
