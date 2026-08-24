'use client'

import { useState } from 'react'
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
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    project_id: '', category: 'other', amount: '', date: '',
    description: '', payment_mode: 'Cash', reference: '',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

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
      <Button size="sm" onClick={() => { setOpen(true); setError('') }}>
        <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
        Add Expense
      </Button>

      <Drawer open={open} onClose={() => setOpen(false)} title="Add Expense"
        footer={<div className="flex gap-3"><Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button><Button className="flex-1" loading={saving} onClick={save}>Save Expense</Button></div>}>
        <div className="space-y-4">
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
