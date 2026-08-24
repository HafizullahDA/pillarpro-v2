'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { FieldWrapper, Input, Select, CurrencyInput } from '@/components/ui/FormField'

type Project = { id: string; name: string }
type Bill    = { id: string; label: string }

const BILL_TYPES = ['RA Bill', 'Final Bill', 'Advance', 'Mobilization Bill']
const PAYMENT_MODES = ['Cash', 'NEFT/RTGS', 'Cheque', 'UPI', 'Other']

export function ReceivablesActions({ projects, bills }: { projects: Project[]; bills: Bill[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [which, setWhich] = useState<'bill' | 'payment' | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [bForm, setBForm] = useState({ project_id: '', bill_number: '', bill_type: 'RA Bill', bill_date: '', gross_amount: '', deductions: '0' })
  const [pForm, setPForm] = useState({ project_id: '', bill_id: '', amount_received: '', date: '', mode: 'NEFT/RTGS', reference: '' })

  const saveBill = async () => {
    if (!bForm.project_id || !bForm.bill_number || !bForm.gross_amount || !bForm.bill_date) { setError('All required fields must be filled.'); return }
    setSaving(true); setError('')
    const { error: err } = await supabase.from('bills').insert({
      project_id: bForm.project_id,
      bill_number: bForm.bill_number.trim(),
      bill_type: bForm.bill_type,
      bill_date: bForm.bill_date,
      gross_amount: parseFloat(bForm.gross_amount),
      deductions: parseFloat(bForm.deductions) || 0,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setWhich(null); router.refresh()
  }

  const savePayment = async () => {
    if (!pForm.project_id || !pForm.bill_id || !pForm.amount_received || !pForm.date) { setError('All required fields must be filled.'); return }
    setSaving(true); setError('')
    const { error: err } = await supabase.from('receivable_payments').insert({
      project_id: pForm.project_id,
      bill_id: pForm.bill_id,
      amount_received: parseFloat(pForm.amount_received),
      date: pForm.date,
      mode: pForm.mode.toLowerCase().replace('/', '_').replace(' ', '_') as 'cash' | 'bank_transfer' | 'cheque' | 'upi' | 'other',
      reference: pForm.reference.trim() || null,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setWhich(null); router.refresh()
  }

  const net = bForm.gross_amount && bForm.deductions
    ? parseFloat(bForm.gross_amount) - parseFloat(bForm.deductions)
    : null

  return (
    <>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => { setWhich('payment'); setError('') }}>Add Payment</Button>
        <Button size="sm" onClick={() => { setWhich('bill'); setError('') }}>
          <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Add Bill
        </Button>
      </div>

      <Drawer open={which === 'bill'} onClose={() => setWhich(null)} title="Add Bill"
        footer={<div className="flex gap-3"><Button variant="secondary" className="flex-1" onClick={() => setWhich(null)}>Cancel</Button><Button className="flex-1" loading={saving} onClick={saveBill}>Save Bill</Button></div>}>
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
          <FieldWrapper label="Project" required>
            <Select value={bForm.project_id} onChange={e => setBForm(f => ({ ...f, project_id: e.target.value }))}>
              <option value="">Select project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </FieldWrapper>
          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="Bill Number" required>
              <Input placeholder="RA-001" value={bForm.bill_number} onChange={e => setBForm(f => ({ ...f, bill_number: e.target.value }))} />
            </FieldWrapper>
            <FieldWrapper label="Bill Type" required>
              <Select value={bForm.bill_type} onChange={e => setBForm(f => ({ ...f, bill_type: e.target.value }))}>
                {BILL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </FieldWrapper>
          </div>
          <FieldWrapper label="Bill Date" required>
            <Input type="date" value={bForm.bill_date} onChange={e => setBForm(f => ({ ...f, bill_date: e.target.value }))} />
          </FieldWrapper>
          <FieldWrapper label="Gross Amount" required>
            <CurrencyInput placeholder="0" value={bForm.gross_amount} onChange={e => setBForm(f => ({ ...f, gross_amount: e.target.value }))} />
          </FieldWrapper>
          <FieldWrapper label="Deductions" hint="TDS, recovery, etc.">
            <CurrencyInput placeholder="0" value={bForm.deductions} onChange={e => setBForm(f => ({ ...f, deductions: e.target.value }))} />
          </FieldWrapper>
          {net !== null && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex justify-between items-center">
              <span className="text-sm text-emerald-700 font-medium">Net Amount</span>
              <span className="text-lg font-bold text-emerald-800 tabular-nums">&#8377;{net.toLocaleString('en-IN')}</span>
            </div>
          )}
        </div>
      </Drawer>

      <Drawer open={which === 'payment'} onClose={() => setWhich(null)} title="Record Payment Received"
        footer={<div className="flex gap-3"><Button variant="secondary" className="flex-1" onClick={() => setWhich(null)}>Cancel</Button><Button className="flex-1" loading={saving} onClick={savePayment}>Save Payment</Button></div>}>
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
          <FieldWrapper label="Project" required>
            <Select value={pForm.project_id} onChange={e => setPForm(f => ({ ...f, project_id: e.target.value }))}>
              <option value="">Select project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </FieldWrapper>
          <FieldWrapper label="Bill" required>
            <Select value={pForm.bill_id} onChange={e => setPForm(f => ({ ...f, bill_id: e.target.value }))}>
              <option value="">Select bill</option>
              {bills.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
            </Select>
          </FieldWrapper>
          <FieldWrapper label="Amount Received" required>
            <CurrencyInput placeholder="0" value={pForm.amount_received} onChange={e => setPForm(f => ({ ...f, amount_received: e.target.value }))} />
          </FieldWrapper>
          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="Mode" required>
              <Select value={pForm.mode} onChange={e => setPForm(f => ({ ...f, mode: e.target.value }))}>
                {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </Select>
            </FieldWrapper>
            <FieldWrapper label="Date" required>
              <Input type="date" value={pForm.date} onChange={e => setPForm(f => ({ ...f, date: e.target.value }))} />
            </FieldWrapper>
          </div>
          <FieldWrapper label="Reference / Cheque No.">
            <Input placeholder="CHQ-001 or UTR" value={pForm.reference} onChange={e => setPForm(f => ({ ...f, reference: e.target.value }))} />
          </FieldWrapper>
        </div>
      </Drawer>
    </>
  )
}
