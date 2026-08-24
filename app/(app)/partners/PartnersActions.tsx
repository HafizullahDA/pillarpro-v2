'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { FieldWrapper, Input, Select, CurrencyInput, Textarea } from '@/components/ui/FormField'

type Project = { id: string; name: string }
type Partner = { id: string; name: string }

const PURPOSES = ['capital_contribution', 'profit_draw', 'reimbursement', 'other']
const MODES = ['Cash', 'NEFT/RTGS', 'Cheque', 'UPI', 'Other']

export function PartnersActions({ projects, partners }: { projects: Project[]; partners: Partner[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [which, setWhich] = useState<'partner' | 'tx' | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [pForm, setPForm] = useState({ name: '', opening_balance: '0' })
  const [tForm, setTForm] = useState({
    partner_id: '', project_id: '', transaction_type: 'paid_by_partner',
    purpose: 'capital_contribution', amount: '', date: '', mode: 'Cash', note: '',
  })

  const savePartner = async () => {
    if (!pForm.name.trim()) { setError('Partner name is required.'); return }
    setSaving(true); setError('')
    const { error: err } = await supabase.from('partners').insert({
      name: pForm.name.trim(),
      opening_balance: parseFloat(pForm.opening_balance) || 0,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setWhich(null); router.refresh()
  }

  const saveTx = async () => {
    if (!tForm.partner_id || !tForm.amount || !tForm.date) { setError('Partner, amount and date are required.'); return }
    setSaving(true); setError('')
    const { error: err } = await supabase.from('partner_transactions').insert({
      partner_id: tForm.partner_id,
      project_id: tForm.project_id || null,
      transaction_type: tForm.transaction_type,
      purpose: tForm.purpose,
      amount: parseFloat(tForm.amount),
      date: tForm.date,
      mode: tForm.mode.toLowerCase().replace('/', '_').replace(' ', '_') as 'cash' | 'bank_transfer' | 'cheque' | 'upi' | 'other',
      notes: tForm.note.trim() || null,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setWhich(null); router.refresh()
  }

  return (
    <>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => { setWhich('tx'); setError('') }}>Record Transaction</Button>
        <Button size="sm" onClick={() => { setWhich('partner'); setError('') }}>
          <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Add Partner
        </Button>
      </div>

      <Drawer open={which === 'partner'} onClose={() => setWhich(null)} title="Add Partner"
        footer={<div className="flex gap-3"><Button variant="secondary" className="flex-1" onClick={() => setWhich(null)}>Cancel</Button><Button className="flex-1" loading={saving} onClick={savePartner}>Save Partner</Button></div>}>
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
          <FieldWrapper label="Partner Name" required>
            <Input placeholder="Suresh Verma" value={pForm.name} onChange={e => setPForm(f => ({ ...f, name: e.target.value }))} />
          </FieldWrapper>
          <FieldWrapper label="Opening Balance" hint="Existing balance from spreadsheet. Positive = partner has paid in more.">
            <CurrencyInput placeholder="0" value={pForm.opening_balance} onChange={e => setPForm(f => ({ ...f, opening_balance: e.target.value }))} />
          </FieldWrapper>
        </div>
      </Drawer>

      <Drawer open={which === 'tx'} onClose={() => setWhich(null)} title="Record Transaction"
        footer={<div className="flex gap-3"><Button variant="secondary" className="flex-1" onClick={() => setWhich(null)}>Cancel</Button><Button className="flex-1" loading={saving} onClick={saveTx}>Save</Button></div>}>
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
          <FieldWrapper label="Partner" required>
            <Select value={tForm.partner_id} onChange={e => setTForm(f => ({ ...f, partner_id: e.target.value }))}>
              <option value="">Select partner</option>
              {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </FieldWrapper>
          <FieldWrapper label="Transaction Type" required>
            <Select value={tForm.transaction_type} onChange={e => setTForm(f => ({ ...f, transaction_type: e.target.value }))}>
              <option value="paid_by_partner">Paid by Partner (increases balance)</option>
              <option value="received_by_partner">Received by Partner (decreases balance)</option>
            </Select>
          </FieldWrapper>
          <FieldWrapper label="Purpose">
            <Select value={tForm.purpose} onChange={e => setTForm(f => ({ ...f, purpose: e.target.value }))}>
              {PURPOSES.map(p => <option key={p} value={p}>{p.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
            </Select>
          </FieldWrapper>
          <FieldWrapper label="Project" hint="Leave blank for firm-level transactions">
            <Select value={tForm.project_id} onChange={e => setTForm(f => ({ ...f, project_id: e.target.value }))}>
              <option value="">Firm-level (no project)</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </FieldWrapper>
          <FieldWrapper label="Amount" required>
            <CurrencyInput placeholder="0" value={tForm.amount} onChange={e => setTForm(f => ({ ...f, amount: e.target.value }))} />
          </FieldWrapper>
          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="Date" required>
              <Input type="date" value={tForm.date} onChange={e => setTForm(f => ({ ...f, date: e.target.value }))} />
            </FieldWrapper>
            <FieldWrapper label="Mode">
              <Select value={tForm.mode} onChange={e => setTForm(f => ({ ...f, mode: e.target.value }))}>
                {MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </Select>
            </FieldWrapper>
          </div>
          <FieldWrapper label="Note">
            <Textarea placeholder="Optional note about this transaction" value={tForm.note} onChange={e => setTForm(f => ({ ...f, note: e.target.value }))} />
          </FieldWrapper>
        </div>
      </Drawer>
    </>
  )
}
