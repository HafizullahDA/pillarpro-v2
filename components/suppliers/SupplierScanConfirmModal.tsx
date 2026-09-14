'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { FieldWrapper, Input, Select, CurrencyInput, Textarea } from '@/components/ui/FormField'
import { useToast } from '@/components/ui/Toast'
import { safeMul, roundToTwo } from '@/lib/calculations/financial'
import { findBestSupplierMatch } from '@/lib/fuzzyMatch'
import { getTodayIST } from '@/lib/date'
import { formatINR } from '@/lib/format'

interface Project {
  id: string
  name: string
}

interface SupplierOption {
  id: string
  name: string
}

export interface ScannedSupplierBillData {
  supplier_name: string | null
  gst_number: string | null
  contact_number: string | null
  address: string | null
  date: string | null
  reference: string | null
  project_name: string | null
  description: string | null
  quantity: number | null
  unit: string | null
  rate: number | null
  amount: number | null
}

interface SupplierScanConfirmModalProps {
  open: boolean
  onClose: () => void
  projects: Project[]
  suppliers: SupplierOption[]
  defaultSupplierId?: string
  scannedData: ScannedSupplierBillData | null
  imagePreviewUrl?: string | null
  onSuccess: () => void
}

const UNITS = [
  { value: 'nos', label: 'nos (pcs)' },
  { value: 'bags', label: 'bags' },
  { value: 'kg', label: 'kg' },
  { value: 'tonnes', label: 'tonnes' },
  { value: 'cum', label: 'cum (m³)' },
  { value: 'sqm', label: 'sqm (m²)' },
  { value: 'rmt', label: 'rmt (m)' },
  { value: 'litre', label: 'litre' },
  { value: 'trips', label: 'trips' },
]

export function SupplierScanConfirmModal({
  open,
  onClose,
  projects,
  suppliers,
  defaultSupplierId,
  scannedData,
  imagePreviewUrl,
  onSuccess,
}: SupplierScanConfirmModalProps) {
  const supabase = createClient()
  const toast = useToast()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Supplier resolution mode: 'existing' | 'new'
  const [supplierMode, setSupplierMode] = useState<'existing' | 'new'>('existing')
  const [selectedSupplierId, setSelectedSupplierId] = useState(defaultSupplierId || '')

  // New supplier creation fields
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    gst_number: '',
    contact_number: '',
    address: '',
  })

  // Project resolution
  const [selectedProjectId, setSelectedProjectId] = useState('')

  // Procurement line item details
  const [procurement, setProcurement] = useState({
    date: getTodayIST(),
    reference: '',
    description: '',
    quantity: '',
    unit: 'bags',
    rate: '',
    amount: '',
    notes: '',
  })

  // Sync state when scannedData opens
  useEffect(() => {
    if (!scannedData) return

    // 1. Supplier Resolution
    let matchedId = defaultSupplierId || ''
    let isMatched = false

    if (defaultSupplierId) {
      matchedId = defaultSupplierId
      isMatched = true
    } else if (scannedData.supplier_name && suppliers.length > 0) {
      const { bestMatch } = findBestSupplierMatch(scannedData.supplier_name, suppliers, 0.55)
      if (bestMatch) {
        matchedId = bestMatch.id
        isMatched = true
      }
    }

    if (isMatched && matchedId) {
      setSupplierMode('existing')
      setSelectedSupplierId(matchedId)
    } else if (scannedData.supplier_name) {
      // Detected a new supplier name not currently in DB
      setSupplierMode('new')
      setSelectedSupplierId('')
      setNewSupplier({
        name: scannedData.supplier_name || '',
        gst_number: scannedData.gst_number || '',
        contact_number: scannedData.contact_number || '',
        address: scannedData.address || '',
      })
    } else {
      // No supplier detected
      setSupplierMode('existing')
      setSelectedSupplierId('')
    }

    // 2. Project Resolution
    let matchedProjId = ''
    if (scannedData.project_name) {
      const q = scannedData.project_name.toLowerCase().trim()
      const found = projects.find(p => p.name.toLowerCase().includes(q) || q.includes(p.name.toLowerCase()))
      if (found) matchedProjId = found.id
    }
    setSelectedProjectId(matchedProjId)

    // 3. Procurement details
    const qtyStr = scannedData.quantity != null ? String(scannedData.quantity) : ''
    const rateStr = scannedData.rate != null ? String(scannedData.rate) : ''
    let amtStr = scannedData.amount != null ? String(scannedData.amount) : ''

    if (!amtStr && qtyStr && rateStr) {
      const q = parseFloat(qtyStr)
      const r = parseFloat(rateStr)
      if (!isNaN(q) && !isNaN(r) && q > 0 && r > 0) {
        amtStr = String(safeMul(q, r))
      }
    }

    setProcurement({
      date: scannedData.date || getTodayIST(),
      reference: scannedData.reference || '',
      description: scannedData.description || 'Materials as per bill',
      quantity: qtyStr,
      unit: scannedData.unit || 'bags',
      rate: rateStr,
      amount: amtStr,
      notes: scannedData.project_name ? `Delivered to: ${scannedData.project_name}` : '',
    })

    setError('')
  }, [scannedData, defaultSupplierId, suppliers, projects])

  const handleQtyChange = (val: string) => {
    setProcurement(prev => {
      const next = { ...prev, quantity: val }
      if (val && prev.rate) {
        const q = parseFloat(val)
        const r = parseFloat(prev.rate)
        if (!isNaN(q) && !isNaN(r) && q > 0 && r > 0) {
          next.amount = String(safeMul(q, r))
        }
      }
      return next
    })
  }

  const handleRateChange = (val: string) => {
    setProcurement(prev => {
      const next = { ...prev, rate: val }
      if (val && prev.quantity) {
        const q = parseFloat(prev.quantity)
        const r = parseFloat(val)
        if (!isNaN(q) && !isNaN(r) && q > 0 && r > 0) {
          next.amount = String(safeMul(q, r))
        }
      }
      return next
    })
  }

  const handleConfirm = async () => {
    if (saving) return
    setError('')

    // Validate supplier
    let targetSupplierId = selectedSupplierId
    let targetSupplierName = ''

    if (supplierMode === 'new') {
      if (!newSupplier.name.trim()) {
        setError('Supplier name is required to create a new supplier.')
        return
      }
      targetSupplierName = newSupplier.name.trim()
    } else {
      if (!targetSupplierId) {
        setError('Please select an existing supplier or switch to "Create New Supplier".')
        return
      }
      targetSupplierName = suppliers.find(s => s.id === targetSupplierId)?.name || 'Supplier'
    }

    // Validate line item
    if (!procurement.description.trim()) {
      setError('Material / item description is required.')
      return
    }

    const amountNum = roundToTwo(parseFloat(procurement.amount))
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid procurement amount greater than 0.')
      return
    }

    if (!procurement.date) {
      setError('Procurement date is required.')
      return
    }

    setSaving(true)

    try {
      // 1. If new supplier, create them first in public.suppliers
      if (supplierMode === 'new') {
        const { data: created, error: sErr } = await supabase
          .from('suppliers')
          .insert({
            name: newSupplier.name.trim(),
            gst_number: newSupplier.gst_number.trim().toUpperCase() || null,
            contact_number: newSupplier.contact_number.trim() || null,
            address: newSupplier.address.trim() || null,
          })
          .select('id')
          .single()

        if (sErr || !created) {
          throw new Error(`Failed to create supplier: ${sErr?.message || 'Unknown error'}`)
        }
        targetSupplierId = created.id
      }

      // 2. Insert procurement transaction into public.supplier_transactions
      const qtyNum = procurement.quantity ? parseFloat(procurement.quantity) : null
      const rateNum = procurement.rate ? parseFloat(procurement.rate) : null

      const { error: txErr } = await supabase.from('supplier_transactions').insert({
        supplier_id: targetSupplierId,
        project_id: selectedProjectId || null, // NULL = General / Central Purchase
        transaction_type: 'procurement',
        description: procurement.description.trim(),
        amount: amountNum,
        quantity: qtyNum && !isNaN(qtyNum) ? qtyNum : null,
        rate: rateNum && !isNaN(rateNum) ? rateNum : null,
        unit: procurement.unit || 'nos',
        date: procurement.date,
        reference: procurement.reference.trim() || null,
        notes: procurement.notes.trim() || null,
      })

      if (txErr) {
        throw new Error(`Failed to record procurement: ${txErr.message}`)
      }

      toast.success(
        `Recorded procurement of ${formatINR(amountNum)} for "${targetSupplierName}"!`
      )
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.')
    } finally {
      setSaving(false)
    }
  }

  const supplierNotDetected = !scannedData?.supplier_name
  const projectNotDetected = !scannedData?.project_name

  return (
    <Modal open={open} onClose={onClose} title="Review Scanned Supplier Invoice / Challan" maxWidth="2xl">
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        {/* Missing details guidance banners */}
        {supplierNotDetected && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-start gap-2.5">
            <span className="text-base leading-none">⚠️</span>
            <div>
              <p className="font-semibold">Supplier name was not detected on invoice</p>
              <p className="text-amber-800 text-[11px] mt-0.5">
                Select an existing supplier from your directory or type new supplier details below.
              </p>
            </div>
          </div>
        )}

        {projectNotDetected && (
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900 flex items-start gap-2.5">
            <span className="text-base leading-none">🏗️</span>
            <div>
              <p className="font-semibold">Project site was not specified on invoice</p>
              <p className="text-blue-800 text-[11px] mt-0.5">
                Select the destination site below or keep as General / Central Bulk Purchase.
              </p>
            </div>
          </div>
        )}

        {/* Image preview collapsible */}
        {imagePreviewUrl && (
          <details className="group border border-slate-200 rounded-xl bg-slate-50/50 p-2.5 text-xs">
            <summary className="cursor-pointer font-semibold text-slate-700 flex items-center justify-between">
              <span>📷 View Scanned Invoice / Slip</span>
              <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="mt-2 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreviewUrl}
                alt="Scanned Invoice"
                className="max-h-56 mx-auto rounded-lg border border-slate-300 object-contain shadow-sm"
              />
            </div>
          </details>
        )}

        {/* SECTION 1: SUPPLIER RESOLUTION */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
              <span>🏢</span>
              <span>Supplier Account</span>
            </label>
            <div className="inline-flex p-0.5 bg-slate-200 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setSupplierMode('existing')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  supplierMode === 'existing'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Existing Supplier
              </button>
              <button
                type="button"
                onClick={() => setSupplierMode('new')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  supplierMode === 'new'
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ➕ Create New Supplier
              </button>
            </div>
          </div>

          {supplierMode === 'existing' ? (
            <FieldWrapper label="Select Supplier from Directory" required>
              <Select
                value={selectedSupplierId}
                onChange={e => setSelectedSupplierId(e.target.value)}
              >
                <option value="">Choose Supplier...</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </FieldWrapper>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <FieldWrapper label="New Supplier Name" required>
                <Input
                  value={newSupplier.name}
                  onChange={e => setNewSupplier(s => ({ ...s, name: e.target.value }))}
                  placeholder="e.g. UltraTech Cement Agency"
                />
              </FieldWrapper>
              <FieldWrapper label="GSTIN" hint="15-digit GST Number">
                <Input
                  value={newSupplier.gst_number}
                  onChange={e => setNewSupplier(s => ({ ...s, gst_number: e.target.value.toUpperCase() }))}
                  placeholder="e.g. 07AAAAA0000A1Z5"
                />
              </FieldWrapper>
              <FieldWrapper label="Contact Phone">
                <Input
                  value={newSupplier.contact_number}
                  onChange={e => setNewSupplier(s => ({ ...s, contact_number: e.target.value }))}
                  placeholder="+91 98765 43210"
                />
              </FieldWrapper>
              <FieldWrapper label="Address / City">
                <Input
                  value={newSupplier.address}
                  onChange={e => setNewSupplier(s => ({ ...s, address: e.target.value }))}
                  placeholder="Shop / Yard location"
                />
              </FieldWrapper>
            </div>
          )}
        </div>

        {/* SECTION 2: PROJECT SITE RESOLUTION */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
          <label className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
            <span>🏗️</span>
            <span>Project (Site Allocation)</span>
          </label>
          <Select
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
          >
            <option value="">— General / Central Bulk Purchase (No specific site) —</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <p className="text-[11px] text-slate-500">
            Assigning to a project logs material cost against that site&apos;s financial summary.
          </p>
        </div>

        {/* SECTION 3: INVOICE / TRANSACTION DETAILS */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
          <label className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
            <span>📦</span>
            <span>Material & Invoice Details</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FieldWrapper label="Date" required>
              <Input
                type="date"
                value={procurement.date}
                onChange={e => setProcurement(p => ({ ...p, date: e.target.value }))}
              />
            </FieldWrapper>
            <FieldWrapper label="Invoice / Challan Reference">
              <Input
                value={procurement.reference}
                onChange={e => setProcurement(p => ({ ...p, reference: e.target.value }))}
                placeholder="e.g. INV-8921 / DC-402"
              />
            </FieldWrapper>
          </div>

          <FieldWrapper label="Material / Item Description" required>
            <Input
              value={procurement.description}
              onChange={e => setProcurement(p => ({ ...p, description: e.target.value }))}
              placeholder="e.g. 100 bags 43 Grade PPC Cement"
            />
          </FieldWrapper>

          <div className="grid grid-cols-3 gap-2.5">
            <FieldWrapper label="Quantity">
              <Input
                type="number"
                step="any"
                value={procurement.quantity}
                onChange={e => handleQtyChange(e.target.value)}
                placeholder="0"
              />
            </FieldWrapper>

            <FieldWrapper label="Unit">
              <Select
                value={procurement.unit}
                onChange={e => setProcurement(p => ({ ...p, unit: e.target.value }))}
              >
                {UNITS.map(u => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </Select>
            </FieldWrapper>

            <FieldWrapper label="Rate (₹)">
              <CurrencyInput
                value={procurement.rate}
                onChange={e => handleRateChange(e.target.value)}
                placeholder="0.00"
              />
            </FieldWrapper>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <FieldWrapper label="Total Procurement Amount (₹)" required hint="Net bill payable to supplier">
              <CurrencyInput
                value={procurement.amount}
                onChange={e => setProcurement(p => ({ ...p, amount: e.target.value }))}
                placeholder="0.00"
                className="text-base font-bold text-slate-900"
              />
            </FieldWrapper>
          </div>

          <FieldWrapper label="Notes / Delivery Remarks (Optional)">
            <Textarea
              value={procurement.notes}
              onChange={e => setProcurement(p => ({ ...p, notes: e.target.value }))}
              placeholder="Vehicle number, driver, unloading notes..."
              rows={2}
            />
          </FieldWrapper>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} loading={saving}>
            Confirm & Record to Khata
          </Button>
        </div>
      </div>
    </Modal>
  )
}

