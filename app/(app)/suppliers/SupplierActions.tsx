'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { FieldWrapper, Input, Select, CurrencyInput, Textarea } from '@/components/ui/FormField'
import { findBestSupplierMatch } from '@/lib/fuzzyMatch'

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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [which, setWhich] = useState<'supplier' | 'procurement' | 'payment' | null>(null)
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')

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
    amount: '',
    date: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
  })

  const [payForm, setPayForm] = useState({
    supplier_id: defaultSupplierId || '',
    project_id: '',
    amount: '',
    mode: 'bank_transfer',
    date: new Date().toISOString().split('T')[0],
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
      const reader = new FileReader()
      reader.onload = async () => {
        const base64Str = reader.result as string

        const res = await fetch('/api/scan-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64Str }),
        })

        const json = await res.json()
        setScanning(false)

        if (!res.ok || json.error) {
          setError(json.error || 'Failed to scan receipt image.')
          return
        }

        const d = json.data
        if (d) {
          setProcForm(f => ({
            ...f,
            amount: d.amount ? String(d.amount) : f.amount,
            date: d.date || f.date,
            description: d.description || d.vendor_name || f.description,
            reference: d.gst_number || f.reference,
          }))

          // If no supplier pre-selected, fuzzy match against supplier options
          if (!defaultSupplierId && d.vendor_name) {
            const { bestMatch } = findBestSupplierMatch(d.vendor_name, suppliers, 0.55)
            if (bestMatch) {
              setProcForm(f => ({ ...f, supplier_id: bestMatch.id }))
            }
          }
        }
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      setScanning(false)
      setError(err.message || 'Error processing image.')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // 1. Add Supplier
  const saveSupplier = async () => {
    if (!sForm.name.trim()) {
      setError('Supplier name is required.')
      return
    }

    setSaving(true)
    setError('')

    const { error: err } = await supabase.from('suppliers').insert({
      name: sForm.name.trim(),
      contact_number: sForm.contact_number.trim() || null,
      gst_number: sForm.gst_number.trim().toUpperCase() || null,
      address: sForm.address.trim() || null,
      notes: sForm.notes.trim() || null,
    })

    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }

    setWhich(null)
    setSForm({ name: '', contact_number: '', gst_number: '', address: '', notes: '' })
    router.refresh()
  }

  // 2. Record Procurement
  const saveProcurement = async () => {
    if (!procForm.supplier_id) {
      setError('Please select a supplier.')
      return
    }
    if (!procForm.description.trim()) {
      setError('Material / item description is required.')
      return
    }
    const amountVal = parseFloat(procForm.amount)
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

    const { error: err } = await supabase.from('supplier_transactions').insert({
      supplier_id: procForm.supplier_id,
      project_id: procForm.project_id || null, // NULL = General / Central
      transaction_type: 'procurement',
      description: procForm.description.trim(),
      amount: amountVal,
      date: procForm.date,
      reference: procForm.reference.trim() || null,
      notes: procForm.notes.trim() || null,
    })

    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }

    setWhich(null)
    setProcForm({
      supplier_id: defaultSupplierId || '',
      project_id: '',
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      reference: '',
      notes: '',
    })
    router.refresh()
  }

  // 3. Record Payment
  const savePayment = async () => {
    if (!payForm.supplier_id) {
      setError('Please select a supplier.')
      return
    }
    const amountVal = parseFloat(payForm.amount)
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
      setError(err.message)
      return
    }

    setWhich(null)
    setPayForm({
      supplier_id: defaultSupplierId || '',
      project_id: '',
      amount: '',
      mode: 'bank_transfer',
      date: new Date().toISOString().split('T')[0],
      reference: '',
      notes: '',
    })
    router.refresh()
  }

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleReceiptScan}
        className="hidden"
      />

      {!hideDirectoryButtons && (
        <div className="flex items-center gap-2">
          {showAddSupplier && (
            <Button size="sm" onClick={() => openModal('supplier')}>
              <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Supplier
            </Button>
          )}
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
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs font-semibold text-blue-900">
                {scanning ? 'Scanning receipt with Gemini OCR...' : 'Auto-fill from Receipt / Invoice'}
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="text-xs py-1 px-2.5 h-auto bg-white border-blue-200 text-blue-700 hover:bg-blue-50"
              loading={scanning}
              onClick={() => fileInputRef.current?.click()}
            >
              Scan Receipt
            </Button>
          </div>

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
    </>
  )
}

