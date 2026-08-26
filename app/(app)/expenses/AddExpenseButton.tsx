'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { FieldWrapper, Input, Select, CurrencyInput, Textarea } from '@/components/ui/FormField'

type Project = { id: string; name: string }

const CATEGORIES = ['labor', 'material', 'equipment', 'transport', 'fuel', 'admin', 'tendering', 'other']
const MODES = ['Cash', 'NEFT/RTGS', 'Cheque', 'UPI', 'Other']

export function AddExpenseButton({ projects }: { projects: Project[] }) {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    project_id: '', category: 'other', amount: '', date: '',
    description: '', payment_mode: 'Cash', reference: '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  // Scan receipt with Gemini Vision API
  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setScanning(true)
    setError('')
    setOpen(true) // Open drawer to show progress and prefilled form

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
          if (d.category && CATEGORIES.includes(d.category)) set('category', d.category)
          if (d.description || d.vendor_name) {
            set('description', [d.vendor_name, d.description].filter(Boolean).join(' — '))
          }
        }
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      setScanning(false)
      setError(err.message || 'Error processing image.')
    }
  }

  const save = async () => {
    if (!form.project_id || !form.amount || !form.date) { setError('Project, amount and date are required.'); return }
    setSaving(true); setError('')
    const { error: err } = await supabase.from('expenses').insert({
      project_id: form.project_id,
      category: form.category,
      amount: parseFloat(form.amount),
      date: form.date,
      description: form.description.trim() || null,
      mode: form.payment_mode.toLowerCase().replace('/', '_').replace(' ', '_') as 'cash' | 'bank_transfer' | 'cheque' | 'upi' | 'other',
      reference: form.reference.trim() || null,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setOpen(false)
    setForm({ project_id: '', category: 'other', amount: '', date: '', description: '', payment_mode: 'Cash', reference: '' })
    router.refresh()
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
          <svg className="h-4 w-4 mr-1.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Scan Receipt (AI)
        </Button>

        <Button size="sm" onClick={() => { setOpen(true); setError('') }}>
          <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Add Expense
        </Button>
      </div>

      <Drawer open={open} onClose={() => setOpen(false)} title="Add Expense"
        footer={<div className="flex gap-3"><Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button><Button className="flex-1" loading={saving} onClick={save}>Save Expense</Button></div>}>
        <div className="space-y-4">
          {scanning && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3.5 flex items-center gap-3">
              <svg className="h-5 w-5 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-xs text-blue-700 font-medium">Scanning receipt image with Gemini Vision AI...</p>
            </div>
          )}

          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

          <FieldWrapper label="Project" required>
            <Select value={form.project_id} onChange={e => set('project_id', e.target.value)}>
              <option value="">Select project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </FieldWrapper>
          <FieldWrapper label="Category" required>
            <Select value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </Select>
          </FieldWrapper>
          <FieldWrapper label="Amount" required>
            <CurrencyInput placeholder="0" value={form.amount} onChange={e => set('amount', e.target.value)} />
          </FieldWrapper>
          <FieldWrapper label="Date" required>
            <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </FieldWrapper>
          <FieldWrapper label="Description">
            <Textarea placeholder="Fuel for JCB, transit charges..." value={form.description} onChange={e => set('description', e.target.value)} />
          </FieldWrapper>
          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="Mode">
              <Select value={form.payment_mode} onChange={e => set('payment_mode', e.target.value)}>
                {MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </Select>
            </FieldWrapper>
            <FieldWrapper label="Reference">
              <Input placeholder="UTR / CHQ no." value={form.reference} onChange={e => set('reference', e.target.value)} />
            </FieldWrapper>
          </div>
        </div>
      </Drawer>
    </>
  )
}
