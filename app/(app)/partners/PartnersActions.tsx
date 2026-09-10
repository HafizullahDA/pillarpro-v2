'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { FieldWrapper, Input, Select, CurrencyInput, Textarea } from '@/components/ui/FormField'
import { ProjectSharesModal } from './ProjectSharesModal'

type Project = { id: string; name: string }
type Partner = { id: string; name: string }
type ProjectShare = {
  id?: string
  project_id: string
  partner_id: string
  share_percentage: number
}

const MODES = ['Cash', 'Bank Transfer (NEFT/RTGS)', 'Cheque', 'UPI', 'Other']

export function PartnersActions({
  projects,
  partners,
  projectShares = [],
  defaultPartnerId,
}: {
  projects: Project[]
  partners: Partner[]
  projectShares?: ProjectShare[]
  defaultPartnerId?: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [which, setWhich] = useState<'partner' | 'tx' | 'shares' | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [pForm, setPForm] = useState({ name: '', opening_balance: '0', notes: '' })
  
  // High-level transaction preset
  const [txPreset, setTxPreset] = useState<'capital_in' | 'draw_out' | 'expense_in' | 'refund_out'>('capital_in')
  
  const [tForm, setTForm] = useState({
    partner_id: defaultPartnerId || (partners[0]?.id ?? ''),
    project_id: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    mode: 'Bank Transfer (NEFT/RTGS)',
    reference: '',
    notes: '',
  })

  const handleOpenTx = (preset: 'capital_in' | 'draw_out' | 'expense_in' | 'refund_out', pId?: string) => {
    setTxPreset(preset)
    setTForm(f => ({
      ...f,
      partner_id: pId || defaultPartnerId || (partners[0]?.id ?? ''),
      date: new Date().toISOString().split('T')[0],
    }))
    setError('')
    setWhich('tx')
  }

  const savePartner = async () => {
    if (!pForm.name.trim()) { setError('Partner name is required.'); return }
    setSaving(true); setError('')
    const { error: err } = await supabase.from('partners').insert({
      name: pForm.name.trim(),
      opening_balance: parseFloat(pForm.opening_balance) || 0,
      notes: pForm.notes.trim() || null,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setWhich(null); setPForm({ name: '', opening_balance: '0', notes: '' }); router.refresh()
  }

  const saveTx = async () => {
    if (!tForm.partner_id || !tForm.amount || !tForm.date) {
      setError('Partner, amount, and date are required.')
      return
    }

    const amt = parseFloat(tForm.amount)
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid amount greater than 0.')
      return
    }

    setSaving(true)
    setError('')

    // Derive underlying transaction_type and purpose from user-friendly preset
    let transaction_type: 'paid_by_partner' | 'received_by_partner' = 'paid_by_partner'
    let purpose: 'capital_contribution' | 'profit_draw' | 'reimbursement' | 'other' = 'capital_contribution'

    if (txPreset === 'capital_in') {
      transaction_type = 'paid_by_partner'
      purpose = 'capital_contribution'
    } else if (txPreset === 'draw_out') {
      transaction_type = 'received_by_partner'
      purpose = 'profit_draw'
    } else if (txPreset === 'expense_in') {
      transaction_type = 'paid_by_partner'
      purpose = 'reimbursement'
    } else if (txPreset === 'refund_out') {
      transaction_type = 'received_by_partner'
      purpose = 'reimbursement'
    }

    const modeFormatted = tForm.mode.toLowerCase().includes('bank')
      ? 'bank_transfer'
      : (tForm.mode.toLowerCase().replace('/', '_').replace(' ', '_') as any)

    const { error: err } = await supabase.from('partner_transactions').insert({
      partner_id: tForm.partner_id,
      project_id: tForm.project_id || null,
      transaction_type,
      purpose,
      amount: amt,
      date: tForm.date,
      mode: modeFormatted,
      reference: tForm.reference.trim() || null,
      notes: tForm.notes.trim() || null,
    })

    setSaving(false)
    if (err) { setError(err.message); return }
    setWhich(null)
    setTForm({
      partner_id: defaultPartnerId || (partners[0]?.id ?? ''),
      project_id: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      mode: 'Bank Transfer (NEFT/RTGS)',
      reference: '',
      notes: '',
    })
    router.refresh()
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleOpenTx('draw_out')}
          disabled={!partners.length}
        >
          <span className="text-red-600 mr-1.5 font-bold">−</span> Record Draw
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleOpenTx('capital_in')}
          disabled={!partners.length}
        >
          <span className="text-emerald-600 mr-1.5 font-bold">+</span> Record Capital
        </Button>
        {projects.length > 0 && partners.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { setWhich('shares'); setError('') }}
          >
            Project Splits
          </Button>
        )}
        <Button
          size="sm"
          onClick={() => { setWhich('partner'); setError('') }}
        >
          <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Partner
        </Button>
      </div>

      {/* Add Partner Drawer */}
      <Drawer
        open={which === 'partner'}
        onClose={() => setWhich(null)}
        title="Add Partner"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setWhich(null)}>
              Cancel
            </Button>
            <Button className="flex-1" loading={saving} onClick={savePartner}>
              Save Partner
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
          <FieldWrapper label="Partner Name" required>
            <Input
              placeholder="e.g. Habibullah Lone"
              value={pForm.name}
              onChange={e => setPForm(f => ({ ...f, name: e.target.value }))}
            />
          </FieldWrapper>
          <FieldWrapper label="Opening Capital Balance" hint="Historical capital brought forward. Positive = firm owes partner.">
            <CurrencyInput
              placeholder="0"
              value={pForm.opening_balance}
              onChange={e => setPForm(f => ({ ...f, opening_balance: e.target.value }))}
            />
          </FieldWrapper>
          <FieldWrapper label="Role & Notes">
            <Textarea
              placeholder="e.g. Managing Partner — site execution, equipment liaison"
              value={pForm.notes}
              onChange={e => setPForm(f => ({ ...f, notes: e.target.value }))}
            />
          </FieldWrapper>
        </div>
      </Drawer>

      {/* Record Transaction Drawer */}
      <Drawer
        open={which === 'tx'}
        onClose={() => setWhich(null)}
        title={
          txPreset === 'capital_in' ? 'Record Capital Infusion' :
          txPreset === 'draw_out' ? 'Record Partner Draw / Profit Withdrawal' :
          txPreset === 'expense_in' ? 'Record Out-of-Pocket Site Expense' :
          'Record Partner Reimbursement'
        }
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setWhich(null)}>
              Cancel
            </Button>
            <Button className="flex-1" loading={saving} onClick={saveTx}>
              Save Transaction
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

          {/* Preset Selector */}
          <FieldWrapper label="Transaction Category">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTxPreset('capital_in')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  txPreset === 'capital_in'
                    ? 'border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-500 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <p className="text-xs font-bold text-emerald-700">+ Capital In</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Partner infuses cash</p>
              </button>

              <button
                type="button"
                onClick={() => setTxPreset('draw_out')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  txPreset === 'draw_out'
                    ? 'border-red-500 bg-red-50/70 ring-1 ring-red-500 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <p className="text-xs font-bold text-red-700">− Personal Draw</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Profit withdrawal</p>
              </button>

              <button
                type="button"
                onClick={() => setTxPreset('expense_in')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  txPreset === 'expense_in'
                    ? 'border-blue-500 bg-blue-50/70 ring-1 ring-blue-500 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <p className="text-xs font-bold text-blue-700">+ Site Expense Paid</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Paid from personal pocket</p>
              </button>

              <button
                type="button"
                onClick={() => setTxPreset('refund_out')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  txPreset === 'refund_out'
                    ? 'border-purple-500 bg-purple-50/70 ring-1 ring-purple-500 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <p className="text-xs font-bold text-purple-700">− Capital Refund</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Firm repays partner</p>
              </button>
            </div>
          </FieldWrapper>

          <FieldWrapper label="Partner" required>
            <Select
              value={tForm.partner_id}
              onChange={e => setTForm(f => ({ ...f, partner_id: e.target.value }))}
            >
              {partners.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </FieldWrapper>

          <FieldWrapper label="Amount (₹)" required>
            <CurrencyInput
              placeholder="0"
              value={tForm.amount}
              onChange={e => setTForm(f => ({ ...f, amount: e.target.value }))}
            />
          </FieldWrapper>

          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="Date" required>
              <Input
                type="date"
                value={tForm.date}
                onChange={e => setTForm(f => ({ ...f, date: e.target.value }))}
              />
            </FieldWrapper>

            <FieldWrapper label="Payment Mode">
              <Select
                value={tForm.mode}
                onChange={e => setTForm(f => ({ ...f, mode: e.target.value }))}
              >
                {MODES.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </FieldWrapper>
          </div>

          <FieldWrapper label="Associated Project" hint="Leave as Firm-Level if general equity or draw">
            <Select
              value={tForm.project_id}
              onChange={e => setTForm(f => ({ ...f, project_id: e.target.value }))}
            >
              <option value="">Firm-Level (General Business)</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </FieldWrapper>

          <FieldWrapper label="Reference / UTR">
            <Input
              placeholder="e.g. RTGS/19402 or Chq #4092"
              value={tForm.reference}
              onChange={e => setTForm(f => ({ ...f, reference: e.target.value }))}
            />
          </FieldWrapper>

          <FieldWrapper label="Notes">
            <Textarea
              placeholder="Reason for draw, bank account details, or procurement context"
              value={tForm.notes}
              onChange={e => setTForm(f => ({ ...f, notes: e.target.value }))}
            />
          </FieldWrapper>
        </div>
      </Drawer>

      {/* Project Shares Modal */}
      {which === 'shares' && (
        <ProjectSharesModal
          open={true}
          onClose={() => setWhich(null)}
          projects={projects}
          partners={partners}
          currentShares={projectShares}
        />
      )}
    </>
  )
}
