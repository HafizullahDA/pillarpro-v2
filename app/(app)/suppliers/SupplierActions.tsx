'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { useToast } from '@/components/ui/Toast'
import { FieldWrapper, Input, Select, CurrencyInput, Textarea } from '@/components/ui/FormField'
import { findBestSupplierMatch } from '@/lib/fuzzyMatch'
import { captureFormError } from '@/lib/monitoring'
import { compressImage } from '@/lib/imageCompress'
import { getTodayIST } from '@/lib/date'
import { safeMul, roundToTwo } from '@/lib/calculations/financial'
import { SupplierScanConfirmModal } from '@/components/suppliers/SupplierScanConfirmModal'

type Project = { id: string; name: string }
type SupplierOption = { id: string; name: string }

const PAYMENT_MODES = [
  { value: 'cash',          label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer (NEFT/RTGS/IMPS)' },
  { value: 'cheque',        label: 'Cheque' },
  { value: 'upi',           label: 'UPI' },
  { value: 'other',         label: 'Other' },
]

interface SupplierActionsProps {
  projects: Project[]
  suppliers?: SupplierOption[]
  defaultSupplierId?: string
  showAddSupplier?: boolean
  hideDirectoryButtons?: boolean
}

export function SupplierActions({
  projects,
  suppliers = [],
  defaultSupplierId,
  showAddSupplier = true,
  hideDirectoryButtons = false,
}: SupplierActionsProps) {
  const router = useRouter()
  const supabase = createClient()
  const toast = useToast()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const [which, setWhich] = useState<'supplier' | 'procurement' | 'payment' | null>(null)
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')

  // Interactive OCR Confirmation modal state
  const [scanModalOpen, setScanModalOpen] = useState(false)
  const [scannedBillData, setScannedBillData] = useState<any>(null)
  const [scanPreviewUrl, setScanPreviewUrl] = useState<string | null>(null)

  // Form states
  const [sForm, setSForm] = useState({
    name: '',
    contact_number: '',
    gst_number: '',
    address: '',
    notes: '',
  })

  const [procForm, setProcForm] = useState({
    supplier_id: defaultSupplierId || '',
    project_id: '',
    description: '',
    quantity: '',
    rate: '',
    unit: 'nos',
    amount: '',
    date: getTodayIST(),
    reference: '',
    notes: '',
  })

  const [payForm, setPayForm] = useState({
    supplier_id: defaultSupplierId || '',
    project_id: '',
    amount: '',
    mode: 'bank_transfer',
    date: getTodayIST(),
    reference: '',
    notes: '',
  })

  // Sync defaultSupplierId when it changes
  useEffect(() => {
    if (defaultSupplierId) {
      setProcForm(f => ({ ...f, supplier_id: defaultSupplierId }))
      setPayForm(f => ({ ...f, supplier_id: defaultSupplierId }))
    }
  }, [defaultSupplierId])

  // Support quick action from URL (e.g. /suppliers?quick=procurement or ?quick=1)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('quick') === 'procurement' || params.get('quick') === 'purchase' || params.get('quick') === '1') {
        openModal('procurement')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openModal = (type: 'supplier' | 'procurement' | 'payment') => {
    setWhich(type)
    setError('')
    if (defaultSupplierId) {
      setProcForm(f => ({ ...f, supplier_id: defaultSupplierId }))
      setPayForm(f => ({ ...f, supplier_id: defaultSupplierId }))
    } else if (suppliers.length === 1) {
      setProcForm(f => ({ ...f, supplier_id: suppliers[0].id }))
      setPayForm(f => ({ ...f, supplier_id: suppliers[0].id }))
    }
  }

  const handleReceiptScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setScanning(true)
    setError('')

    try {
      const base64Str = await compressImage(file)
      setScanPreviewUrl(base64Str)

      const res = await fetch('/api/scan-supplier-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Str }),
      })

      const json = await res.json()
      setScanning(false)

      if (!res.ok || json.error) {
        setError(json.error || 'Failed to scan supplier invoice.')
        return
      }

      setScannedBillData(json.data)
      setScanModalOpen(true)
      setWhich(null)
    } catch (err: any) {
      setScanning(false)
      const userMsg = await captureFormError('ScanReceiptSupplier', err)
      setError(userMsg)
    } finally {
      if (cameraInputRef.current) cameraInputRef.current.value = ''
      if (galleryInputRef.current) galleryInputRef.current.value = ''
    }
  }

  // 1. Add Supplier
  const saveSupplier = async () => {
    if (saving) return
    if (!sForm.name.trim()) {
      setError('Supplier name is required.')
      return
    }

    setSaving(true)
    setError('')

    // Read the organization at save time instead of relying on an async value
    // loaded when the drawer mounted. This prevents a fast submission from
    // inserting a row without organization_id, which RLS correctly rejects.
    const { data: organizationId, error: organizationError } = await supabase.rpc(
      'get_user_organization_id'
    )

    if (organizationError || !organizationId) {
      setSaving(false)
      setError('Your account is not linked to an organization. Please contact an administrator.')
      return
    }

    const { error: err } = await supabase.from('suppliers').insert({
      name: sForm.name.trim(),
      contact_number: sForm.contact_number.trim() || null,
      gst_number: sForm.gst_number.trim().toUpperCase() || null,
      address: sForm.address.trim() || null,
      notes: sForm.notes.trim() || null,
      organization_id: organizationId,
    })

    setSaving(false)
    if (err) {
      const userMsg = await captureFormError('AddSupplier', err, { name: sForm.name })
      setError(userMsg)
      return
    }

    const savedName = sForm.name.trim()
    setWhich(null)
    setSForm({ name: '', contact_number: '', gst_number: '', address: '', notes: '' })
    toast.success(`Supplier "${savedName}" added successfully`)
    router.refresh()
  }

  // 2. Record Procurement
  const saveProcurement = async () => {
    if (saving) return
    if (!procForm.supplier_id) {
      setError('Please select a supplier.')
      return
    }
    if (!procForm.description.trim()) {
      setError('Material / item description is required.')
      return
    }
    const amountVal = roundToTwo(parseFloat(procForm.amount))
    if (isNaN(amountVal) || amountVal <= 0) {
      setError('Please enter a valid procurement amount greater than 0.')
      return
    }
    if (!procForm.date) {
      setError('Date is required.')
      return
    }

    setSaving(true)
    setError('')

    const quantityVal = procForm.quantity ? parseFloat(procForm.quantity) : null
    const rateVal = procForm.rate ? parseFloat(procForm.rate) : null
    const unitVal = procForm.unit?.trim() || 'nos'

    const { error: err } = await supabase.from('supplier_transactions').insert({
      supplier_id: procForm.supplier_id,
      project_id: procForm.project_id || null, // NULL = General / Central
      transaction_type: 'procurement',
      description: procForm.description.trim(),
      amount: amountVal,
      quantity: quantityVal,
      rate: rateVal,
      unit: unitVal,
      date: procForm.date,
      reference: procForm.reference.trim() || null,
      notes: procForm.notes.trim() || null,
    })

    setSaving(false)
    if (err) {
      const userMsg = await captureFormError('RecordProcurement', err, {
        supplier_id: procForm.supplier_id,
        amount: procForm.amount,
      })
      setError(userMsg)
      return
    }

    setWhich(null)
    setProcForm({
      supplier_id: defaultSupplierId || '',
      project_id: '',
      description: '',
      quantity: '',
      rate: '',
      unit: 'nos',
      amount: '',
      date: getTodayIST(),
      reference: '',
      notes: '',
    })
    toast.success(`Procurement of ₹${amountVal.toLocaleString('en-IN')} recorded`)
    router.refresh()
  }

  // 3. Record Payment
  const savePayment = async () => {
    if (saving) return
    if (!payForm.supplier_id) {
      setError('Please select a supplier.')
      return
    }
    const amountVal = roundToTwo(parseFloat(payForm.amount))
    if (isNaN(amountVal) || amountVal <= 0) {
      setError('Please enter a valid payment amount greater than 0.')
      return
    }
    if (!payForm.date) {
      setError('Date is required.')
      return
    }

    setSaving(true)
    setError('')

    const { error: err } = await supabase.from('supplier_transactions').insert({
      supplier_id: payForm.supplier_id,
      project_id: payForm.project_id || null, // NULL = General
      transaction_type: 'payment',
      description: `Payment to supplier (${payForm.mode.replace('_', ' ')})`,
      amount: amountVal,
      mode: payForm.mode,
      date: payForm.date,
      reference: payForm.reference.trim() || null,
      notes: payForm.notes.trim() || null,
    })

    setSaving(false)
    if (err) {
      const userMsg = await captureFormError('RecordSupplierPayment', err, {
        supplier_id: payForm.supplier_id,
        amount: payForm.amount,
      })
      setError(userMsg)
      return
    }

    setWhich(null)
    setPayForm({
      supplier_id: defaultSupplierId || '',
      project_id: '',
      amount: '',
      mode: 'bank_transfer',
      date: getTodayIST(),
      reference: '',
      notes: '',
    })
    toast.success(`Payment of ₹${amountVal.toLocaleString('en-IN')} recorded`)
    router.refresh()
  }

  return (
    <>
      {/* 1. Direct Camera Scanner Input */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleReceiptScan}
        className="hidden"
      />

      {/* 2. Photo Library / Gallery Input */}
      <input
        type="file"
        ref={galleryInputRef}
        accept="image/*"
        onChange={handleReceiptScan}
        className="hidden"
      />

      {!hideDirectoryButtons && (
        <div className="flex flex-wrap items-center gap-2">
          {showAddSupplier && (
            <Button size="sm" onClick={() => openModal('supplier')}>
              <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Supplier
            </Button>
          )}

          {/* Direct Scan Invoice / Challan Button */}
          <div className="inline-flex items-center rounded-xl bg-blue-50 border border-blue-200 p-0.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={scanning}
              onClick={() => cameraInputRef.current?.click()}
              className="bg-transparent border-0 text-blue-700 hover:bg-white text-xs h-8 px-2.5 shadow-none flex items-center gap-1.5"
              title="Scan supplier invoice or challan with camera"
            >
              <span>📷</span>
              <span>Scan Bill</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={scanning}
              onClick={() => galleryInputRef.current?.click()}
              className="bg-transparent border-0 text-blue-700 hover:bg-white text-xs h-8 px-2 shadow-none"
              title="Upload invoice or slip from gallery"
            >
              <span>🖼️</span>
            </Button>
          </div>

          <Button size="sm" variant="secondary" onClick={() => openModal('procurement')}>
            + Procurement
          </Button>
          <Button size="sm" variant="secondary" onClick={() => openModal('payment')}>
            + Payment
          </Button>
        </div>
      )}

      {/* ADD SUPPLIER DRAWER */}
      <Drawer
        open={which === 'supplier'}
        onClose={() => setWhich(null)}
        title="Add New Supplier"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setWhich(null)}>
              Cancel
            </Button>
            <Button className="flex-1" loading={saving} onClick={saveSupplier}>
              Save Supplier
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

          <FieldWrapper label="Supplier Name" required>
            <Input
              placeholder="e.g. UltraTech Cement Agency / Sharma Steels"
              value={sForm.name}
              onChange={e => setSForm(f => ({ ...f, name: e.target.value }))}
            />
          </FieldWrapper>

          <FieldWrapper label="Contact Number">
            <Input
              type="tel"
              placeholder="+91 98765 43210"
              value={sForm.contact_number}
              onChange={e => setSForm(f => ({ ...f, contact_number: e.target.value }))}
            />
          </FieldWrapper>

          <FieldWrapper label="GST Number" hint="15-digit GSTIN for compliance records">
            <Input
              placeholder="e.g. 07AAAAA0000A1Z5"
              value={sForm.gst_number}
              onChange={e => setSForm(f => ({ ...f, gst_number: e.target.value.toUpperCase() }))}
            />
          </FieldWrapper>

          <FieldWrapper label="Address">
            <Input
              placeholder="Shop / Yard address or city"
              value={sForm.address}
              onChange={e => setSForm(f => ({ ...f, address: e.target.value }))}
            />
          </FieldWrapper>

          <FieldWrapper label="Notes">
            <Textarea
              placeholder="Bank details, credit terms, remarks..."
              value={sForm.notes}
              onChange={e => setSForm(f => ({ ...f, notes: e.target.value }))}
            />
          </FieldWrapper>
        </div>
      </Drawer>

      {/* RECORD PROCUREMENT DRAWER */}
      <Drawer
        open={which === 'procurement'}
        onClose={() => setWhich(null)}
        title="Record Supplier Procurement"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setWhich(null)}>
              Cancel
            </Button>
            <Button className="flex-1" loading={saving} onClick={saveProcurement}>
              Save Procurement
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

          {/* Auto-fill from Receipt / Bill */}
          {scanning ? (
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3.5 flex items-center gap-3">
              <svg className="h-5 w-5 text-blue-600 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <div>
                <p className="text-xs text-blue-900 font-semibold">Scanning...</p>
                <p className="text-xs text-blue-700">Extracting bill details, amount, and line items</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-3 gap-2.5">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-xs font-semibold text-blue-900">
                  Auto-fill from Receipt / Invoice
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="text-xs py-1 px-2.5 h-auto bg-white border-blue-200 text-blue-700 hover:bg-blue-50 flex items-center gap-1.5"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <span>📷</span>
                  <span>Camera</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="text-xs py-1 px-2.5 h-auto bg-white border-blue-200 text-blue-700 hover:bg-blue-50 flex items-center gap-1.5"
                  onClick={() => galleryInputRef.current?.click()}
                >
                  <span>🖼️</span>
                  <span>Gallery</span>
                </Button>
              </div>
            </div>
          )}

          <FieldWrapper label="Supplier" required>
            {defaultSupplierId ? (
              <Input
                disabled
                value={suppliers.find(s => s.id === defaultSupplierId)?.name ?? 'Selected Supplier'}
              />
            ) : (
              <Select
                value={procForm.supplier_id}
                onChange={e => setProcForm(f => ({ ...f, supplier_id: e.target.value }))}
              >
                <option value="">Select a supplier...</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            )}
          </FieldWrapper>

          <FieldWrapper label="Project (Site)" hint="Leave as General if central yard or bulk firm purchase">
            <Select
              value={procForm.project_id}
              onChange={e => setProcForm(f => ({ ...f, project_id: e.target.value }))}
            >
              <option value="">— General / Central Purchase —</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </FieldWrapper>

          <FieldWrapper label="Material / Item Description" required>
            <Input
              placeholder="e.g. 100 bags PPC Cement 43 Grade"
              value={procForm.description}
              onChange={e => setProcForm(f => ({ ...f, description: e.target.value }))}
            />
          </FieldWrapper>

          {/* Optional Material Quantity, Unit & Rate */}
          <div className="grid grid-cols-3 gap-2">
            <FieldWrapper label="Quantity" hint="Optional">
              <Input
                type="number"
                step="any"
                placeholder="0"
                value={procForm.quantity}
                onChange={e => {
                  const qty = e.target.value
                  setProcForm(f => {
                    const next = { ...f, quantity: qty }
                    if (qty && f.rate) {
                      const q = parseFloat(qty)
                      const r = parseFloat(f.rate)
                      if (!isNaN(q) && !isNaN(r) && q > 0 && r > 0) {
                        next.amount = String(safeMul(q, r))
                      }
                    }
                    return next
                  })
                }}
              />
            </FieldWrapper>

            <FieldWrapper label="Unit">
              <Select
                value={procForm.unit}
                onChange={e => setProcForm(f => ({ ...f, unit: e.target.value }))}
              >
                <option value="nos">nos (pcs)</option>
                <option value="bags">bags</option>
                <option value="kg">kg</option>
                <option value="tonnes">tonnes</option>
                <option value="cum">cum (m³)</option>
                <option value="sqm">sqm (m²)</option>
                <option value="rmt">rmt (m)</option>
                <option value="litre">litre</option>
                <option value="trips">trips</option>
              </Select>
            </FieldWrapper>

            <FieldWrapper label="Rate (₹)" hint="Per unit">
              <CurrencyInput
                placeholder="0"
                value={procForm.rate}
                onChange={e => {
                  const rateVal = e.target.value
                  setProcForm(f => {
                    const next = { ...f, rate: rateVal }
                    if (rateVal && f.quantity) {
                      const q = parseFloat(f.quantity)
                      const r = parseFloat(rateVal)
                      if (!isNaN(q) && !isNaN(r) && q > 0 && r > 0) {
                        next.amount = String(safeMul(q, r))
                      }
                    }
                    return next
                  })
                }}
              />
            </FieldWrapper>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="Amount (₹)" required>
              <CurrencyInput
                placeholder="0"
                value={procForm.amount}
                onChange={e => setProcForm(f => ({ ...f, amount: e.target.value }))}
              />
            </FieldWrapper>

            <FieldWrapper label="Date" required>
              <Input
                type="date"
                value={procForm.date}
                onChange={e => setProcForm(f => ({ ...f, date: e.target.value }))}
              />
            </FieldWrapper>
          </div>

          <FieldWrapper label="Invoice / Challan Reference">
            <Input
              placeholder="e.g. Inv #8921 / DC-402"
              value={procForm.reference}
              onChange={e => setProcForm(f => ({ ...f, reference: e.target.value }))}
            />
          </FieldWrapper>

          <FieldWrapper label="Notes">
            <Textarea
              placeholder="Delivery vehicle number, quality check notes..."
              value={procForm.notes}
              onChange={e => setProcForm(f => ({ ...f, notes: e.target.value }))}
            />
          </FieldWrapper>
        </div>
      </Drawer>

      {/* RECORD PAYMENT DRAWER */}
      <Drawer
        open={which === 'payment'}
        onClose={() => setWhich(null)}
        title="Record Supplier Payment"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setWhich(null)}>
              Cancel
            </Button>
            <Button className="flex-1" loading={saving} onClick={savePayment}>
              Save Payment
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

          <FieldWrapper label="Supplier" required>
            {defaultSupplierId ? (
              <Input
                disabled
                value={suppliers.find(s => s.id === defaultSupplierId)?.name ?? 'Selected Supplier'}
              />
            ) : (
              <Select
                value={payForm.supplier_id}
                onChange={e => setPayForm(f => ({ ...f, supplier_id: e.target.value }))}
              >
                <option value="">Select a supplier...</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            )}
          </FieldWrapper>

          <FieldWrapper label="Project (Optional tag)">
            <Select
              value={payForm.project_id}
              onChange={e => setPayForm(f => ({ ...f, project_id: e.target.value }))}
            >
              <option value="">— General Firm Payment —</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </FieldWrapper>

          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="Amount Paid (₹)" required>
              <CurrencyInput
                placeholder="0"
                value={payForm.amount}
                onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
              />
            </FieldWrapper>

            <FieldWrapper label="Date" required>
              <Input
                type="date"
                value={payForm.date}
                onChange={e => setPayForm(f => ({ ...f, date: e.target.value }))}
              />
            </FieldWrapper>
          </div>

          <FieldWrapper label="Payment Mode">
            <Select
              value={payForm.mode}
              onChange={e => setPayForm(f => ({ ...f, mode: e.target.value }))}
            >
              {PAYMENT_MODES.map(m => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </FieldWrapper>

          <FieldWrapper label="Reference / Transaction ID" hint="Cheque number, UTR number, UPI transaction ID">
            <Input
              placeholder="e.g. UTR #49281048201"
              value={payForm.reference}
              onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))}
            />
          </FieldWrapper>

          <FieldWrapper label="Notes">
            <Textarea
              placeholder="Payment remarks or bank account used..."
              value={payForm.notes}
              onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))}
            />
          </FieldWrapper>
        </div>
      </Drawer>

      {/* Interactive OCR Confirmation Modal for Supplier Invoices */}
      <SupplierScanConfirmModal
        open={scanModalOpen}
        onClose={() => {
          setScanModalOpen(false)
          setScannedBillData(null)
          setScanPreviewUrl(null)
        }}
        projects={projects}
        suppliers={suppliers}
        defaultSupplierId={defaultSupplierId}
        scannedData={scannedBillData}
        imagePreviewUrl={scanPreviewUrl}
        onSuccess={() => {
          router.refresh()
        }}
      />
    </>
  )
}
