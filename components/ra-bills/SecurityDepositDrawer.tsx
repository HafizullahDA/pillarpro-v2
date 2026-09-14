'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { useToast } from '@/components/ui/Toast'
import { FieldWrapper, Input, Select, CurrencyInput, Textarea } from '@/components/ui/FormField'
import { getTodayIST } from '@/lib/date'
import { securityDepositSchema } from '@/lib/validations/raBill'
import { translateError } from '@/lib/errorTranslator'
import { ProjectOption } from '@/app/(app)/ra-bills/RABillActions'

export const DEPOSIT_TYPES = [
  { value: 'performance_bank_guarantee', label: 'Performance Bank Guarantee (PBG)' },
  { value: 'security_deposit',            label: 'Security Deposit (SD)' },
  { value: 'earnest_money_deposit',       label: 'Earnest Money Deposit (EMD)' },
  { value: 'fixed_deposit_receipt',       label: 'Fixed Deposit Receipt (FDR)' },
  { value: 'other',                       label: 'Other Guarantee / Deposit' },
]

interface SecurityDepositDrawerProps {
  open: boolean
  onClose: () => void
  projects: ProjectOption[]
  defaultProjectId?: string
}

export function SecurityDepositDrawer({
  open,
  onClose,
  projects,
  defaultProjectId,
}: SecurityDepositDrawerProps) {
  const router = useRouter()
  const supabase = createClient()
  const toast = useToast()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [depositForm, setDepositForm] = useState({
    project_id: defaultProjectId || '',
    deposit_type: 'performance_bank_guarantee',
    reference_number: '',
    issuing_bank: '',
    amount: '',
    issue_date: getTodayIST(),
    expiry_date: '',
    claim_expiry_date: '',
    notes: '',
  })

  const handleSaveDeposit = async () => {
    if (saving) return

    // 1. Zod schema validation
    const validationResult = securityDepositSchema.safeParse({
      project_id: depositForm.project_id,
      deposit_type: depositForm.deposit_type,
      reference_number: depositForm.reference_number,
      issuing_bank: depositForm.issuing_bank,
      amount: depositForm.amount,
      issue_date: depositForm.issue_date || undefined,
      expiry_date: depositForm.expiry_date,
      claim_expiry_date: depositForm.claim_expiry_date || undefined,
      notes: depositForm.notes,
    })

    if (!validationResult.success) {
      setError(validationResult.error.issues[0]?.message || 'Please check the deposit form inputs.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const amt = parseFloat(depositForm.amount)

      const { error: err } = await supabase.from('security_deposits').insert({
        project_id: depositForm.project_id,
        deposit_type: depositForm.deposit_type as any,
        reference_number: depositForm.reference_number.trim(),
        issuing_bank: depositForm.issuing_bank.trim() || null,
        amount: amt,
        issue_date: depositForm.issue_date || null,
        expiry_date: depositForm.expiry_date,
        claim_expiry_date: depositForm.claim_expiry_date || null,
        status: 'active',
        document_url: null,
        notes: depositForm.notes.trim() || null,
      })

      if (err) {
        const { userMessage } = translateError(err)
        setError(userMessage)
        setSaving(false)
        return
      }

      const savedRef = depositForm.reference_number.trim()
      setSaving(false)
      onClose()
      setDepositForm({
        project_id: defaultProjectId || '',
        deposit_type: 'performance_bank_guarantee',
        reference_number: '',
        issuing_bank: '',
        amount: '',
        issue_date: getTodayIST(),
        expiry_date: '',
        claim_expiry_date: '',
        notes: '',
      })
      toast.success(`Guarantee "${savedRef}" saved successfully`)
      router.refresh()
    } catch (err: any) {
      setSaving(false)
      const { userMessage } = translateError(err, 'Failed to save guarantee.')
      setError(userMessage)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Add Security Deposit / Bank Guarantee"
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" loading={saving} onClick={handleSaveDeposit}>
            Save Guarantee
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

        <FieldWrapper label="Project" required>
          <Select
            value={depositForm.project_id}
            onChange={e => setDepositForm(f => ({ ...f, project_id: e.target.value }))}
          >
            <option value="">Select Project</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </FieldWrapper>

        <FieldWrapper label="Deposit / Instrument Type" required>
          <Select
            value={depositForm.deposit_type}
            onChange={e => setDepositForm(f => ({ ...f, deposit_type: e.target.value }))}
          >
            {DEPOSIT_TYPES.map(t => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </FieldWrapper>

        <div className="grid grid-cols-2 gap-3">
          <FieldWrapper label="Reference / BG No." required hint="e.g. 0540124BG0001">
            <Input
              placeholder="BG / FDR No."
              value={depositForm.reference_number}
              onChange={e => setDepositForm(f => ({ ...f, reference_number: e.target.value }))}
            />
          </FieldWrapper>

          <FieldWrapper label="Issuing Bank">
            <Input
              placeholder="State Bank of India"
              value={depositForm.issuing_bank}
              onChange={e => setDepositForm(f => ({ ...f, issuing_bank: e.target.value }))}
            />
          </FieldWrapper>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FieldWrapper label="Amount (₹)" required>
            <CurrencyInput
              placeholder="0"
              value={depositForm.amount}
              onChange={e => setDepositForm(f => ({ ...f, amount: e.target.value }))}
            />
          </FieldWrapper>

          <FieldWrapper label="Issue Date">
            <Input
              type="date"
              value={depositForm.issue_date}
              onChange={e => setDepositForm(f => ({ ...f, issue_date: e.target.value }))}
            />
          </FieldWrapper>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FieldWrapper label="Expiry Date (Crucial)" required hint="Expiry of guarantee">
            <Input
              type="date"
              value={depositForm.expiry_date}
              onChange={e => setDepositForm(f => ({ ...f, expiry_date: e.target.value }))}
            />
          </FieldWrapper>

          <FieldWrapper label="Claim Expiry Date" hint="Department claim period">
            <Input
              type="date"
              value={depositForm.claim_expiry_date}
              onChange={e => setDepositForm(f => ({ ...f, claim_expiry_date: e.target.value }))}
            />
          </FieldWrapper>
        </div>

        <FieldWrapper label="Notes">
          <Textarea
            placeholder="FDR margin details, lien mark, extension requirements..."
            value={depositForm.notes}
            onChange={e => setDepositForm(f => ({ ...f, notes: e.target.value }))}
          />
        </FieldWrapper>
      </div>
    </Drawer>
  )
}

