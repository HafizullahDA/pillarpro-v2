'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { FieldWrapper, Input, Select, CurrencyInput } from '@/components/ui/FormField'

const STATUS_OPTIONS = [
  { value: 'active',    label: 'Active'    },
  { value: 'on_hold',   label: 'On Hold'   },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export function AddProjectButton() {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '', agency_name: '', advertised_cost: '', awarded_amount: '',
    start_date: '', end_date: '', status: 'active',
  })

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Project name is required.'); return }
    setSaving(true); setError('')

    const { error: err } = await supabase.from('projects').insert({
      name: form.name.trim(),
      agency_name: form.agency_name.trim() || null,
      advertised_cost: form.advertised_cost ? Number(form.advertised_cost) : null,
      awarded_amount: form.awarded_amount ? Number(form.awarded_amount) : null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      status: form.status,
    })

    setSaving(false)
    if (err) { setError(err.message); return }
    setOpen(false)
    setForm({ name: '', agency_name: '', advertised_cost: '', awarded_amount: '', start_date: '', end_date: '', status: 'active' })
    router.refresh()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Add Project
      </Button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Add Project"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="flex-1" loading={saving} onClick={handleSave}>Save Project</Button>
          </div>
        }
      >
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
          <FieldWrapper label="Project Name" required>
            <Input placeholder="Site Road Widening — Sector 4" value={form.name} onChange={e => set('name', e.target.value)} />
          </FieldWrapper>
          <FieldWrapper label="Agency Name">
            <Input placeholder="NHAI / PWD / Municipal Corporation" value={form.agency_name} onChange={e => set('agency_name', e.target.value)} />
          </FieldWrapper>
          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="Advertised Cost">
              <CurrencyInput placeholder="0" value={form.advertised_cost} onChange={e => set('advertised_cost', e.target.value)} />
            </FieldWrapper>
            <FieldWrapper label="Awarded Amount">
              <CurrencyInput placeholder="0" value={form.awarded_amount} onChange={e => set('awarded_amount', e.target.value)} />
            </FieldWrapper>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="Start Date">
              <Input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </FieldWrapper>
            <FieldWrapper label="End Date">
              <Input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
            </FieldWrapper>
          </div>
          <FieldWrapper label="Status">
            <Select value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </FieldWrapper>
        </div>
      </Drawer>
    </>
  )
}
