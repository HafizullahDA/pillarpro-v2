'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { FieldWrapper, Input, Select, CurrencyInput } from '@/components/ui/FormField'

type Project = { id: string; name: string }

const UNITS = ['bags', 'kg', 'tonnes', 'nos', 'cum', 'sqm', 'rmt', 'litre']
const PAYMENT_MODES = ['Cash', 'NEFT/RTGS', 'Cheque', 'UPI', 'Other']

export function VendorActions({ projects }: { projects: Project[] }) {
  const router = useRouter()
  const supabase = createClient()

  const [which, setWhich] = useState<'vendor' | 'purchase' | 'payment' | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([])

  // Form state
  const [vForm, setVForm] = useState({ project_id: '', name: '', contact_person: '', phone: '' })
  const [pForm, setPForm] = useState({ project_id: '', vendor_id: '', material: '', unit: 'bags', quantity: '', rate: '', date: '' })
  const [payForm, setPayForm] = useState({ project_id: '', vendor_id: '', amount_paid: '', mode: 'Cash', date: '', reference: '' })

  const loadVendors = async (projectId: string) => {
    if (!projectId) { setVendors([]); return }
    const { data } = await supabase.from('vendors').select('id, name').eq('project_id', projectId).order('name')
    setVendors(data ?? [])
  }

  const open = (type: 'vendor' | 'purchase' | 'payment') => {
    setWhich(type); setError('')
    if (projects.length === 1) {
      const pid = projects[0].id
      if (type === 'purchase') { setPForm(f => ({ ...f, project_id: pid })); loadVendors(pid) }
      if (type === 'payment') { setPayForm(f => ({ ...f, project_id: pid })); loadVendors(pid) }
      if (type === 'vendor')  setVForm(f => ({ ...f, project_id: pid }))
    }
  }

  const saveVendor = async () => {
    if (!vForm.project_id || !vForm.name.trim()) { setError('Project and vendor name are required.'); return }
    setSaving(true); setError('')
    const { error: err } = await supabase.from('vendors').insert({
      project_id: vForm.project_id,
      name: vForm.name.trim(),
      contact_person: vForm.contact_person.trim() || null,
      phone: vForm.phone.trim() || null,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setWhich(null); router.refresh()
  }

  const savePurchase = async () => {
    if (!pForm.project_id || !pForm.vendor_id || !pForm.material || !pForm.quantity || !pForm.rate || !pForm.date) {
      setError('All fields are required.'); return
    }
    setSaving(true); setError('')
    const { error: err } = await supabase.from('vendor_purchases').insert({
      project_id: pForm.project_id,
      vendor_id: pForm.vendor_id,
      material: pForm.material.trim(),
      unit: pForm.unit,
      quantity: parseFloat(pForm.quantity),
      rate: parseFloat(pForm.rate),
      // amount is a generated column (quantity * rate) — do NOT insert it
      date: pForm.date,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setWhich(null); router.refresh()
  }

  const savePayment = async () => {
    if (!payForm.project_id || !payForm.vendor_id || !payForm.amount_paid || !payForm.date) {
      setError('Project, vendor, amount and date are required.'); return
    }
    setSaving(true); setError('')
    const { error: err } = await supabase.from('vendor_payments').insert({
      project_id: payForm.project_id,
      vendor_id: payForm.vendor_id,
      amount: parseFloat(payForm.amount_paid),
      mode: payForm.mode.toLowerCase().replace('/', '_').replace(' ', '_') as 'cash' | 'bank_transfer' | 'cheque' | 'upi' | 'other',
      date: payForm.date,
      reference: payForm.reference.trim() || null,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setWhich(null); router.refresh()
  }


  const subtotal = pForm.quantity && pForm.rate
    ? parseFloat(pForm.quantity) * parseFloat(pForm.rate)
    : null

  return (
    <>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => open('payment')}>Add Payment</Button>
        <Button variant="secondary" size="sm" onClick={() => open('purchase')}>Add Purchase</Button>
        <Button size="sm" onClick={() => open('vendor')}>
          <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Add Vendor
        </Button>
      </div>

      {/* Add Vendor */}
      <Drawer open={which === 'vendor'} onClose={() => setWhich(null)} title="Add Vendor"
        footer={<div className="flex gap-3"><Button variant="secondary" className="flex-1" onClick={() => setWhich(null)}>Cancel</Button><Button className="flex-1" loading={saving} onClick={saveVendor}>Save Vendor</Button></div>}>
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
          <FieldWrapper label="Project" required>
            <Select value={vForm.project_id} onChange={e => setVForm(f => ({ ...f, project_id: e.target.value }))}>
              <option value="">Select project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </FieldWrapper>
          <FieldWrapper label="Vendor Name" required>
            <Input placeholder="Sharma Steel Traders" value={vForm.name} onChange={e => setVForm(f => ({ ...f, name: e.target.value }))} />
          </FieldWrapper>
          <FieldWrapper label="Contact Person">
            <Input placeholder="Ramesh Sharma" value={vForm.contact_person} onChange={e => setVForm(f => ({ ...f, contact_person: e.target.value }))} />
          </FieldWrapper>
          <FieldWrapper label="Phone">
            <Input type="tel" placeholder="98XXXXXXXX" value={vForm.phone} onChange={e => setVForm(f => ({ ...f, phone: e.target.value }))} />
          </FieldWrapper>
        </div>
      </Drawer>

      {/* Add Purchase */}
      <Drawer open={which === 'purchase'} onClose={() => setWhich(null)} title="Add Purchase"
        footer={<div className="flex gap-3"><Button variant="secondary" className="flex-1" onClick={() => setWhich(null)}>Cancel</Button><Button className="flex-1" loading={saving} onClick={savePurchase}>Save Purchase</Button></div>}>
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
          <FieldWrapper label="Project" required>
            <Select value={pForm.project_id} onChange={e => { setPForm(f => ({ ...f, project_id: e.target.value, vendor_id: '' })); loadVendors(e.target.value) }}>
              <option value="">Select project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </FieldWrapper>
          <FieldWrapper label="Vendor" required>
            <Select value={pForm.vendor_id} onChange={e => setPForm(f => ({ ...f, vendor_id: e.target.value }))} disabled={!pForm.project_id}>
              <option value="">{pForm.project_id ? 'Select vendor' : 'Select project first'}</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
          </FieldWrapper>
          <FieldWrapper label="Material" required>
            <Input placeholder="Cement OPC 53 Grade" value={pForm.material} onChange={e => setPForm(f => ({ ...f, material: e.target.value }))} />
          </FieldWrapper>
          <div className="grid grid-cols-3 gap-3">
            <FieldWrapper label="Unit" required>
              <Select value={pForm.unit} onChange={e => setPForm(f => ({ ...f, unit: e.target.value }))}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </Select>
            </FieldWrapper>
            <FieldWrapper label="Quantity" required>
              <Input type="number" min="0" step="0.01" placeholder="0" value={pForm.quantity} onChange={e => setPForm(f => ({ ...f, quantity: e.target.value }))} />
            </FieldWrapper>
            <FieldWrapper label="Rate / Unit" required>
              <CurrencyInput placeholder="0" value={pForm.rate} onChange={e => setPForm(f => ({ ...f, rate: e.target.value }))} />
            </FieldWrapper>
          </div>
          {subtotal !== null && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 flex justify-between items-center">
              <span className="text-sm text-blue-700 font-medium">Subtotal</span>
              <span className="text-lg font-bold text-blue-800 tabular-nums">&#8377;{subtotal.toLocaleString('en-IN')}</span>
            </div>
          )}
          <FieldWrapper label="Date" required>
            <Input type="date" value={pForm.date} onChange={e => setPForm(f => ({ ...f, date: e.target.value }))} />
          </FieldWrapper>
        </div>
      </Drawer>

      {/* Add Payment */}
      <Drawer open={which === 'payment'} onClose={() => setWhich(null)} title="Add Vendor Payment"
        footer={<div className="flex gap-3"><Button variant="secondary" className="flex-1" onClick={() => setWhich(null)}>Cancel</Button><Button className="flex-1" loading={saving} onClick={savePayment}>Save Payment</Button></div>}>
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
          <FieldWrapper label="Project" required>
            <Select value={payForm.project_id} onChange={e => { setPayForm(f => ({ ...f, project_id: e.target.value, vendor_id: '' })); loadVendors(e.target.value) }}>
              <option value="">Select project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </FieldWrapper>
          <FieldWrapper label="Vendor" required>
            <Select value={payForm.vendor_id} onChange={e => setPayForm(f => ({ ...f, vendor_id: e.target.value }))} disabled={!payForm.project_id}>
              <option value="">{payForm.project_id ? 'Select vendor' : 'Select project first'}</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
          </FieldWrapper>
          <FieldWrapper label="Amount Paid" required>
            <CurrencyInput placeholder="0" value={payForm.amount_paid} onChange={e => setPayForm(f => ({ ...f, amount_paid: e.target.value }))} />
          </FieldWrapper>
          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="Mode" required>
              <Select value={payForm.mode} onChange={e => setPayForm(f => ({ ...f, mode: e.target.value }))}>
                {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </Select>
            </FieldWrapper>
            <FieldWrapper label="Date" required>
              <Input type="date" value={payForm.date} onChange={e => setPayForm(f => ({ ...f, date: e.target.value }))} />
            </FieldWrapper>
          </div>
          <FieldWrapper label="Reference / Cheque No.">
            <Input placeholder="CHQ-001 or UTR number" value={payForm.reference} onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))} />
          </FieldWrapper>
        </div>
      </Drawer>
    </>
  )
}
