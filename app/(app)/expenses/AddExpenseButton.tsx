'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { FieldWrapper, Input, Select, CurrencyInput, Textarea } from '@/components/ui/FormField'
import { findBestSupplierMatch } from '@/lib/fuzzyMatch'

type Project = { id: string; name: string }
type SupplierItem = { id: string; name: string }

const CATEGORIES = ['labor', 'material', 'equipment', 'transport', 'fuel', 'admin', 'tendering', 'other']
const MODES = ['Cash', 'NEFT/RTGS', 'Cheque', 'UPI', 'Other']

type SupplierLinkState =
  | { type: 'idle' }
  | {
      type: 'matched'
      ocrVendor: string
      matchedSupplier: SupplierItem
      score: number
    }
  | {
      type: 'no_match'
      ocrVendor: string
      newSupplierName: string
      newSupplierGst: string
    }
  | {
      type: 'confirmed'
      supplierId: string
      supplierName: string
    }
  | {
      type: 'new_confirmed'
      newSupplierName: string
      newSupplierGst: string
    }
  | {
      type: 'manual_pick'
      selectedSupplierId: string
    }
  | {
      type: 'skipped'
    }

export function AddExpenseButton({
  projects,
  suppliers = [],
}: {
  projects: Project[]
  suppliers?: SupplierItem[]
}) {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [supplierList, setSupplierList] = useState<SupplierItem[]>(suppliers)

  const [form, setForm] = useState({
    project_id: '',
    category: 'material',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    payment_mode: 'Cash',
    reference: '',
  })

  const [supplierLink, setSupplierLink] = useState<SupplierLinkState>({ type: 'idle' })

  // Refresh suppliers list when drawer opens or prop updates
  useEffect(() => {
    setSupplierList(suppliers)
  }, [suppliers])

  const refreshSuppliers = async () => {
    const { data } = await supabase.from('suppliers').select('id, name').order('name')
    if (data) setSupplierList(data)
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  // Scan receipt with Gemini Vision API
  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setScanning(true)
    setError('')
    setSupplierLink({ type: 'idle' })
    setOpen(true) // Open drawer to show progress

    // Ensure we have the latest suppliers list for matching
    await refreshSuppliers()

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
          if (d.amount) set('amount', String(d.amount))
          if (d.date) set('date', d.date)
          if (d.category && CATEGORIES.includes(d.category)) {
            set('category', d.category)
          } else {
            set('category', 'material')
          }
          if (d.description || d.vendor_name) {
            set('description', [d.vendor_name, d.description].filter(Boolean).join(' — '))
          }

          // Fuzzy match against existing suppliers
          const ocrVendor = (d.vendor_name || '').trim()
          if (ocrVendor) {
            const { bestMatch, score } = findBestSupplierMatch(ocrVendor, supplierList, 0.55)

            if (bestMatch && score >= 0.55) {
              setSupplierLink({
                type: 'matched',
                ocrVendor,
                matchedSupplier: bestMatch,
                score: Math.round(score * 100),
              })
            } else {
              setSupplierLink({
                type: 'no_match',
                ocrVendor,
                newSupplierName: ocrVendor,
                newSupplierGst: d.gst_number || '',
              })
            }
          }
        }
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      setScanning(false)
      setError(err.message || 'Error processing image.')
    } finally {
      // Reset file input so re-scanning the same file works
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const save = async () => {
    if (!form.project_id || !form.amount || !form.date) {
      setError('Project, amount, and date are required.')
      return
    }

    const amountNum = parseFloat(form.amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount greater than 0.')
      return
    }

    setSaving(true)
    setError('')

    const modeNormalized = form.payment_mode
      .toLowerCase()
      .replace('/', '_')
      .replace(' ', '_') as 'cash' | 'bank_transfer' | 'cheque' | 'upi' | 'other'

    const payload = {
      project_id: form.project_id,
      category: form.category as any,
      amount: amountNum,
      date: form.date,
      description: form.description.trim() || null,
      mode: modeNormalized,
      reference: form.reference.trim() || null,
    }

    // Offline queue fallback
    if (typeof window !== 'undefined' && !navigator.onLine) {
      try {
        const { saveToOfflineQueue } = await import('@/lib/offline/db')
        await saveToOfflineQueue('expense', payload)
        setSaving(false)
        setOpen(false)
        resetForm()
        alert('Offline: Expense saved locally. Will auto-sync when network returns.')
        return
      } catch (err: any) {
        setSaving(false)
        setError('Failed to save offline entry locally.')
        return
      }
    }

    try {
      // 1. Resolve Target Supplier ID if applicable
      let targetSupplierId: string | null = null

      if (supplierLink.type === 'matched') {
        targetSupplierId = supplierLink.matchedSupplier.id
      } else if (supplierLink.type === 'confirmed') {
        targetSupplierId = supplierLink.supplierId
      } else if (supplierLink.type === 'manual_pick' && supplierLink.selectedSupplierId) {
        targetSupplierId = supplierLink.selectedSupplierId
      } else if (supplierLink.type === 'new_confirmed' || supplierLink.type === 'no_match') {
        const newName =
          supplierLink.type === 'new_confirmed'
            ? supplierLink.newSupplierName.trim()
            : supplierLink.newSupplierName.trim()

        if (newName) {
          const gstVal =
            supplierLink.type === 'new_confirmed'
              ? supplierLink.newSupplierGst.trim() || null
              : supplierLink.newSupplierGst.trim() || null

          // Insert new supplier
          const { data: newSup, error: supErr } = await supabase
            .from('suppliers')
            .insert({
              name: newName,
              gst_number: gstVal,
            })
            .select('id')
            .single()

          if (supErr) {
            setSaving(false)
            setError(`Failed to create new supplier: ${supErr.message}`)
            return
          }
          targetSupplierId = newSup.id
        }
      }

      // 2. Insert into expenses table
      const { data: expData, error: expErr } = await supabase
        .from('expenses')
        .insert(payload)
        .select('id')
        .single()

      if (expErr) {
        setSaving(false)
        setError(expErr.message)
        return
      }

      // 3. Create supplier_transactions (procurement) record linked to supplier & expense
      if (targetSupplierId) {
        const { error: supTxErr } = await supabase.from('supplier_transactions').insert({
          supplier_id: targetSupplierId,
          project_id: payload.project_id || null,
          transaction_type: 'procurement',
          description: payload.description || 'Receipt scan procurement',
          amount: payload.amount,
          date: payload.date,
          mode: payload.mode,
          reference: payload.reference,
          expense_id: expData?.id || null,
        })

        if (supTxErr) {
          console.error('Failed to link supplier transaction:', supTxErr)
        }
      }

      setSaving(false)
      setOpen(false)
      resetForm()
      router.refresh()
    } catch (err: any) {
      setSaving(false)
      setError(err.message || 'An unexpected error occurred.')
    }
  }

  const resetForm = () => {
    setForm({
      project_id: '',
      category: 'material',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      payment_mode: 'Cash',
      reference: '',
    })
    setSupplierLink({ type: 'idle' })
  }

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileScan}
        className="hidden"
      />

      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <svg
            className="h-4 w-4 mr-1.5 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Scan Receipt
        </Button>

        <Button
          size="sm"
          onClick={() => {
            setOpen(true)
            setError('')
            refreshSuppliers()
          }}
        >
          <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Expense
        </Button>
      </div>

      <Drawer
        open={open}
        onClose={() => {
          setOpen(false)
          resetForm()
        }}
        title="Add Expense"
        footer={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setOpen(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button className="flex-1" loading={saving} onClick={save}>
              Save Expense
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {scanning && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3.5 flex items-center gap-3">
              <svg className="h-5 w-5 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <div>
                <p className="text-xs text-blue-900 font-semibold">Scanning receipt with Gemini OCR...</p>
                <p className="text-xs text-blue-700">Extracting vendor, amount, items, and matching supplier account</p>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ══════════════════════════════════════════
              SUPPLIER ACCOUNT LINKING BANNER / CARD
              ══════════════════════════════════════════ */}

          {/* 1. Matched Supplier Confirmation */}
          {supplierLink.type === 'matched' && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3.5 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold mt-0.5">
                  ✓
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-blue-900">
                      Supplier Matched ({supplierLink.score}% confidence)
                    </p>
                    <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded font-mono">
                      OCR: &ldquo;{supplierLink.ocrVendor}&rdquo;
                    </span>
                  </div>
                  <p className="text-xs text-blue-800 mt-1">
                    Add this procurement to <strong className="font-semibold text-blue-950">{supplierLink.matchedSupplier.name}</strong>?
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 px-3 h-auto"
                  onClick={() =>
                    setSupplierLink({
                      type: 'confirmed',
                      supplierId: supplierLink.matchedSupplier.id,
                      supplierName: supplierLink.matchedSupplier.name,
                    })
                  }
                >
                  Confirm {supplierLink.matchedSupplier.name}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="text-xs py-1 px-3 h-auto"
                  onClick={() =>
                    setSupplierLink({
                      type: 'manual_pick',
                      selectedSupplierId: supplierLink.matchedSupplier.id,
                    })
                  }
                >
                  Pick Different
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="text-xs py-1 px-2.5 h-auto text-slate-500"
                  onClick={() => setSupplierLink({ type: 'skipped' })}
                >
                  Skip Link
                </Button>
              </div>
            </div>
          )}

          {/* 2. Confirmed Supplier Status */}
          {supplierLink.type === 'confirmed' && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
                  ✓
                </span>
                <span className="text-xs text-emerald-900 font-medium">
                  Linked to Supplier Account:{' '}
                  <strong className="font-semibold text-emerald-950">{supplierLink.supplierName}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSupplierLink({
                    type: 'manual_pick',
                    selectedSupplierId: supplierLink.supplierId,
                  })
                }
                className="text-xs text-emerald-700 hover:text-emerald-900 underline font-medium"
              >
                Change
              </button>
            </div>
          )}

          {/* 3. No Match Found — Prompt to Add as New Supplier */}
          {supplierLink.type === 'no_match' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 space-y-3">
              <div>
                <p className="text-xs font-bold text-amber-900">New Supplier Detected on Receipt</p>
                <p className="text-xs text-amber-800 mt-0.5">
                  &ldquo;{supplierLink.ocrVendor}&rdquo; isn&apos;t in your supplier list. Add as a new supplier?
                </p>
              </div>

              <div className="space-y-2 bg-white/90 p-2.5 rounded-lg border border-amber-200/80">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                    Supplier Name (Editable)
                  </label>
                  <Input
                    value={supplierLink.newSupplierName}
                    onChange={e =>
                      setSupplierLink(s =>
                        s.type === 'no_match' ? { ...s, newSupplierName: e.target.value } : s
                      )
                    }
                    placeholder="Supplier Business Name"
                    className="py-1 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                    GSTIN (Optional)
                  </label>
                  <Input
                    value={supplierLink.newSupplierGst}
                    onChange={e =>
                      setSupplierLink(s =>
                        s.type === 'no_match' ? { ...s, newSupplierGst: e.target.value.toUpperCase() } : s
                      )
                    }
                    placeholder="15-digit GSTIN"
                    className="py-1 px-3 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs py-1 px-3 h-auto"
                  onClick={() =>
                    setSupplierLink({
                      type: 'new_confirmed',
                      newSupplierName: supplierLink.newSupplierName,
                      newSupplierGst: supplierLink.newSupplierGst,
                    })
                  }
                >
                  ✓ Create & Link Supplier
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="text-xs py-1 px-3 h-auto"
                  onClick={() =>
                    setSupplierLink({
                      type: 'manual_pick',
                      selectedSupplierId: '',
                    })
                  }
                >
                  Pick Existing Instead
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="text-xs py-1 px-2.5 h-auto text-slate-500"
                  onClick={() => setSupplierLink({ type: 'skipped' })}
                >
                  Skip Link
                </Button>
              </div>
            </div>
          )}

          {/* 4. Confirmed New Supplier Creation */}
          {supplierLink.type === 'new_confirmed' && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-white text-xs font-bold">
                  +
                </span>
                <span className="text-xs text-amber-900 font-medium">
                  Will create new supplier:{' '}
                  <strong className="font-semibold text-amber-950">{supplierLink.newSupplierName}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSupplierLink({
                    type: 'no_match',
                    ocrVendor: supplierLink.newSupplierName,
                    newSupplierName: supplierLink.newSupplierName,
                    newSupplierGst: supplierLink.newSupplierGst,
                  })
                }
                className="text-xs text-amber-700 hover:text-amber-900 underline font-medium"
              >
                Edit
              </button>
            </div>
          )}

          {/* 5. Manual Dropdown / Pick Different */}
          {supplierLink.type === 'manual_pick' && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
              <FieldWrapper label="Link to Supplier Account">
                <Select
                  value={supplierLink.selectedSupplierId}
                  onChange={e => {
                    const val = e.target.value
                    if (val === '__add_new__') {
                      setSupplierLink({
                        type: 'no_match',
                        ocrVendor: form.description || '',
                        newSupplierName: form.description || '',
                        newSupplierGst: '',
                      })
                    } else {
                      setSupplierLink({
                        type: 'manual_pick',
                        selectedSupplierId: val,
                      })
                    }
                  }}
                >
                  <option value="">— Do Not Link to Supplier —</option>
                  {supplierList.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                  <option value="__add_new__">+ Add New Supplier...</option>
                </Select>
              </FieldWrapper>
            </div>
          )}

          {/* 6. Idle / Skipped: show compact link toggle */}
          {(supplierLink.type === 'idle' || supplierLink.type === 'skipped') && (
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>Supplier Account:</span>
              <button
                type="button"
                onClick={() =>
                  setSupplierLink({
                    type: 'manual_pick',
                    selectedSupplierId: '',
                  })
                }
                className="text-blue-600 hover:underline font-medium"
              >
                + Link to a Supplier
              </button>
            </div>
          )}

          {/* ══════════════════════════════════════════
              EXPENSE FORM FIELDS
              ══════════════════════════════════════════ */}
          <FieldWrapper label="Project (Site)" required>
            <Select value={form.project_id} onChange={e => set('project_id', e.target.value)}>
              <option value="">Select project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </FieldWrapper>

          <FieldWrapper label="Category" required>
            <Select value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </Select>
          </FieldWrapper>

          <FieldWrapper label="Amount (₹)" required>
            <CurrencyInput placeholder="0" value={form.amount} onChange={e => set('amount', e.target.value)} />
          </FieldWrapper>

          <FieldWrapper label="Date" required>
            <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </FieldWrapper>

          <FieldWrapper label="Description">
            <Textarea
              placeholder="Items procured, vendor name, notes..."
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </FieldWrapper>

          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="Mode">
              <Select value={form.payment_mode} onChange={e => set('payment_mode', e.target.value)}>
                {MODES.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </FieldWrapper>

            <FieldWrapper label="Reference">
              <Input
                placeholder="Invoice # / UTR / Chq"
                value={form.reference}
                onChange={e => set('reference', e.target.value)}
              />
            </FieldWrapper>
          </div>
        </div>
      </Drawer>
    </>
  )
}
