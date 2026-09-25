'use client'

import { useState, useEffect, useMemo } from 'react'
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
import { calculateAdditionalPerformanceSecurity } from '@/lib/calculations/financial'

export const DEPOSIT_TYPES = [
  { value: 'additional_performance_security', label: 'Additional Security Deposit / CDR (Unbalanced Bid)' },
  { value: 'performance_bank_guarantee',      label: 'Performance Bank Guarantee (PBG)' },
  { value: 'security_deposit',               label: 'Security Deposit (SD)' },
  { value: 'earnest_money_deposit',          label: 'Earnest Money Deposit (EMD)' },
  { value: 'fixed_deposit_receipt',          label: 'Fixed Deposit Receipt (FDR)' },
  { value: 'other',                          label: 'Other Guarantee / Deposit' },
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

  // J&K PWD Unbalanced Bid Calculator Inputs
  const [calcAdvertisedCost, setCalcAdvertisedCost] = useState('')
  const [calcBidPrice, setCalcBidPrice] = useState('')

  const isAsd =
    depositForm.deposit_type === 'additional_performance_security' ||
    depositForm.deposit_type === 'additional_security_deposit'

  // When project changes, auto-populate advertised cost and awarded bid price if present
  useEffect(() => {
    if (depositForm.project_id) {
      const selected = projects.find(p => p.id === depositForm.project_id)
      if (selected) {
        if (selected.advertised_cost) {
          setCalcAdvertisedCost(String(selected.advertised_cost))
        }
        if (selected.awarded_amount) {
          setCalcBidPrice(String(selected.awarded_amount))
        }
      }
    }
  }, [depositForm.project_id, projects])

  // Compute Unbalanced Bid ASD metrics as per J&K PWD Circular (08-08-2025)
  const computedAsd = useMemo(() => {
    if (!isAsd) return null
    const adv = parseFloat(calcAdvertisedCost)
    const bid = parseFloat(calcBidPrice)
    if (isNaN(adv) || isNaN(bid) || adv <= 0 || bid <= 0) return null
    return calculateAdditionalPerformanceSecurity(adv, bid)
  }, [isAsd, calcAdvertisedCost, calcBidPrice])

  const handleApplyCalculatedAsd = () => {
    if (!computedAsd || computedAsd.additionalSecurityAmount <= 0) return
    setDepositForm(f => ({
      ...f,
      amount: String(computedAsd.additionalSecurityAmount),
      notes: f.notes
        ? f.notes
        : `Additional Security Deposit for Unbalanced Bid (${computedAsd.percentageBelow}% below advertised cost as per J&K PWD Circular 08-08-2025)`,
    }))
  }

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
      toast.success(`Deposit / Instrument "${savedRef}" saved successfully`)
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
      title={isAsd ? 'Add Additional Security Deposit / CDR' : 'Add Security Deposit / Bank Guarantee'}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" loading={saving} onClick={handleSaveDeposit}>
            {isAsd ? 'Save Security / CDR' : 'Save Guarantee'}
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

        {/* J&K PWD Circular Unbalanced Bid Auto-Calculator */}
        {isAsd && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-white text-[10px] font-bold">
                  %
                </span>
                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                  J&K PWD Unbalanced Bid Calculator
                </h4>
              </div>
              <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-300">
                Circular 08-08-2025
              </span>
            </div>

            <p className="text-[11px] text-amber-900 leading-snug">
              Additional performance security is calculated on the <strong>bidder&apos;s quoted bid price</strong>:
            </p>
            <div className="text-[10px] bg-white/70 border border-amber-200 rounded p-2 text-amber-950 space-y-0.5">
              <div>• <strong>≤ 10% below</strong>: Nil (No ASD required)</div>
              <div>• <strong>&gt; 10% up to 20% below</strong>: 0.1% for every percentage point below 10%</div>
              <div>• <strong>≥ 20% below</strong>: 1% + 0.2% for every percentage point below 20%</div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-amber-950 mb-1">
                  Advertised Cost (₹)
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 1795000"
                  value={calcAdvertisedCost}
                  onChange={e => setCalcAdvertisedCost(e.target.value)}
                  className="bg-white text-xs h-8"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-amber-950 mb-1">
                  Quoted / Bid Price (₹)
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 1339422.22"
                  value={calcBidPrice}
                  onChange={e => setCalcBidPrice(e.target.value)}
                  className="bg-white text-xs h-8"
                />
              </div>
            </div>

            {/* Live Calculation Output Card */}
            {computedAsd && (
              <div className="rounded-lg bg-white border border-amber-200 p-2.5 space-y-1.5 text-xs shadow-sm">
                <div className="flex justify-between items-center text-slate-700">
                  <span className="text-[11px]">Percentage Below Advertised:</span>
                  <span className="font-semibold text-slate-900">
                    {computedAsd.percentageBelow > 0
                      ? `${computedAsd.percentageBelow}% below`
                      : '0% (At or above cost)'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span className="text-[11px]">ASD Rate on Bid Price:</span>
                  <span className="font-bold text-amber-700">
                    {computedAsd.ratePercent > 0 ? `${computedAsd.ratePercent}%` : 'Nil (0%)'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-700 pt-1 border-t border-slate-100">
                  <span className="text-[11px] font-semibold">Calculated Security:</span>
                  <span className="font-mono font-bold text-sm text-emerald-700">
                    ₹{computedAsd.additionalSecurityAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {computedAsd.additionalSecurityAmount > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="w-full mt-2 h-7 text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 font-medium"
                    onClick={handleApplyCalculatedAsd}
                  >
                    Apply ₹{computedAsd.additionalSecurityAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} to Amount
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <FieldWrapper
            label={isAsd ? 'Term Deposit / CDR No.' : 'Reference / BG No.'}
            required
            hint={isAsd ? 'e.g. CDR No. 139707' : 'e.g. 0540124BG0001'}
          >
            <Input
              placeholder={isAsd ? 'CDR / FDR / Ref No.' : 'BG / FDR No.'}
              value={depositForm.reference_number}
              onChange={e => setDepositForm(f => ({ ...f, reference_number: e.target.value }))}
            />
          </FieldWrapper>

          <FieldWrapper label={isAsd ? 'Issuing Bank & Branch' : 'Issuing Bank'}>
            <Input
              placeholder={isAsd ? 'e.g. J&K Bank Branch Pazalpora' : 'State Bank of India'}
              value={depositForm.issuing_bank}
              onChange={e => setDepositForm(f => ({ ...f, issuing_bank: e.target.value }))}
            />
          </FieldWrapper>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FieldWrapper
            label="Amount (₹)"
            required
            hint={isAsd ? 'From formula above or allotment CDR' : undefined}
          >
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
          <FieldWrapper
            label={isAsd ? 'Validity / Expiry Date' : 'Expiry Date (Crucial)'}
            required
            hint={isAsd ? 'Validity of CDR / Deposit' : 'Expiry of guarantee'}
          >
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
            placeholder={
              isAsd
                ? 'Allotment order reference, CDR lien mark, J&K Bank branch details...'
                : 'FDR margin details, lien mark, extension requirements...'
            }
            value={depositForm.notes}
            onChange={e => setDepositForm(f => ({ ...f, notes: e.target.value }))}
          />
        </FieldWrapper>
      </div>
    </Drawer>
  )
}

