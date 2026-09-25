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
import {
  calculateUnbalancedBidSecurity,
  ASD_RULES,
  AsdRuleId,
} from '@/lib/calculations/financial'

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

  // Multi-Rule Engine Calculator State
  const [selectedRuleId, setSelectedRuleId] = useState<AsdRuleId>('jk_pwd')
  const [jkCalculationBase, setJkCalculationBase] = useState<'advertised_cost' | 'bid_price'>('advertised_cost')
  const [calcAdvertisedCost, setCalcAdvertisedCost] = useState('')
  const [calcBidPrice, setCalcBidPrice] = useState('')
  const [customThreshold, setCustomThreshold] = useState('10')
  const [customRate, setCustomRate] = useState('')

  const isAsd =
    depositForm.deposit_type === 'additional_performance_security' ||
    depositForm.deposit_type === 'additional_security_deposit'

  const activeRule = ASD_RULES[selectedRuleId] || ASD_RULES.jk_pwd

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

  // Compute Unbalanced Bid ASD metrics via Universal Multi-Rule Engine
  const computedAsd = useMemo(() => {
    if (!isAsd) return null
    const adv = parseFloat(calcAdvertisedCost)
    const bid = parseFloat(calcBidPrice)
    if (isNaN(adv) || isNaN(bid) || adv <= 0 || bid <= 0) return null
    return calculateUnbalancedBidSecurity({
      ruleId: selectedRuleId,
      advertisedCost: adv,
      bidPrice: bid,
      calculationBase: jkCalculationBase,
      customThresholdPercent: parseFloat(customThreshold) || 0,
      customRatePercent: parseFloat(customRate) || 0,
    })
  }, [isAsd, selectedRuleId, jkCalculationBase, calcAdvertisedCost, calcBidPrice, customThreshold, customRate])

  const handleApplyCalculatedAsd = () => {
    if (!computedAsd || computedAsd.additionalSecurityAmount <= 0) return
    setDepositForm(f => ({
      ...f,
      amount: String(computedAsd.additionalSecurityAmount),
      notes: f.notes
        ? f.notes
        : `Additional Security / APG calculated under ${computedAsd.ruleName}: ${computedAsd.calculationFormulaText}`,
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

        {/* Universal Multi-Rule Engine for Unbalanced Bid / Additional Performance Security */}
        {isAsd && (
          <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-3.5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-white text-[10px] font-bold">
                  %
                </span>
                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                  Unbalanced Bid &amp; ASD Engine
                </h4>
              </div>
              <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                Multi-Norm Engine
              </span>
            </div>

            {/* Procuring Authority / Calculation Rule Selector */}
            <FieldWrapper label="Department / Regulatory Norm" required>
              <Select
                value={selectedRuleId}
                onChange={e => setSelectedRuleId(e.target.value as AsdRuleId)}
                className="bg-white text-xs font-medium"
              >
                {Object.values(ASD_RULES).map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </FieldWrapper>

            {/* Official Authority & Formula Context */}
            <div className="text-[11px] bg-white/90 border border-amber-200 rounded-lg p-2.5 text-amber-950 space-y-1">
              <div className="flex justify-between items-center text-[10px] text-amber-800 font-semibold border-b border-amber-100 pb-1">
                <span>{activeRule.authority}</span>
                <span className="font-mono">{activeRule.circularRef.split('(')[0]}</span>
              </div>
              <p className="pt-0.5 text-[11px] text-slate-700 leading-snug">
                {activeRule.basisDescription}
              </p>
            </div>

            {/* J&K PWD Ground Practice vs Circular Toggle */}
            {selectedRuleId === 'jk_pwd' && (
              <div className="space-y-1.5 pt-0.5">
                <label className="block text-[11px] font-semibold text-amber-950">
                  Calculation Standard (J&K):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setJkCalculationBase('advertised_cost')}
                    className={`px-2.5 py-1.5 rounded-lg border text-left text-[11px] transition-all cursor-pointer ${
                      jkCalculationBase === 'advertised_cost'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-xs font-semibold'
                        : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100/50'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>PWD Division Practice</span>
                      {jkCalculationBase === 'advertised_cost' && <span className="text-[10px]">✓ Active</span>}
                    </div>
                    <div className={jkCalculationBase === 'advertised_cost' ? 'text-amber-100 text-[10px]' : 'text-slate-500 text-[10px]'}>
                      On Advertised Cost (Allotment Order)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setJkCalculationBase('bid_price')}
                    className={`px-2.5 py-1.5 rounded-lg border text-left text-[11px] transition-all cursor-pointer ${
                      jkCalculationBase === 'bid_price'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-xs font-semibold'
                        : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100/50'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>Finance Circular Text</span>
                      {jkCalculationBase === 'bid_price' && <span className="text-[10px]">✓ Active</span>}
                    </div>
                    <div className={jkCalculationBase === 'bid_price' ? 'text-amber-100 text-[10px]' : 'text-slate-500 text-[10px]'}>
                      On Quoted Bid Price (Literal)
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* If Custom Rule Selected */}
            {selectedRuleId === 'custom' && (
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-amber-950 mb-1">
                    Trigger Threshold (% below)
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g. 10"
                    value={customThreshold}
                    onChange={e => setCustomThreshold(e.target.value)}
                    className="bg-white text-xs h-8"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-amber-950 mb-1">
                    Security Rate (% on Bid)
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g. 5"
                    value={customRate}
                    onChange={e => setCustomRate(e.target.value)}
                    className="bg-white text-xs h-8"
                  />
                </div>
              </div>
            )}

            {/* Financial Inputs */}
            <div className="grid grid-cols-2 gap-2.5 pt-0.5">
              <div>
                <label className="block text-[11px] font-semibold text-amber-950 mb-1">
                  Advertised / Est. Cost (₹)
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 1795000"
                  value={calcAdvertisedCost}
                  onChange={e => setCalcAdvertisedCost(e.target.value)}
                  className="bg-white text-xs h-8 font-mono"
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
                  className="bg-white text-xs h-8 font-mono"
                />
              </div>
            </div>

            {/* Live Calculation Output Card */}
            {computedAsd && (
              <div className="rounded-lg bg-white border border-amber-200 p-2.5 space-y-2 text-xs shadow-sm">
                <div className="flex justify-between items-center text-slate-700">
                  <span className="text-[11px]">Rebate / Below Estimate:</span>
                  <span className="font-semibold text-slate-900">
                    {computedAsd.percentageBelow > 0
                      ? `${computedAsd.percentageBelow}% below`
                      : '0% (At or above cost)'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span className="text-[11px]">Formula Evaluation:</span>
                  <span
                    className="text-[11px] font-medium text-slate-800 text-right max-w-[65%] truncate"
                    title={computedAsd.slabDescription}
                  >
                    {computedAsd.slabDescription}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-700 pt-1 border-t border-slate-100">
                  <span className="text-[11px] font-semibold">Calculated Security (APS):</span>
                  <span className="font-mono font-bold text-sm text-emerald-700">
                    ₹{computedAsd.additionalSecurityAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* For J&K PWD: Show Side-by-Side Comparison Between Allotment Demand and Circular Text */}
                {selectedRuleId === 'jk_pwd' && computedAsd.departmentDemandAmount !== undefined && (
                  <div className="rounded-md bg-amber-50/90 border border-amber-200 p-2 space-y-1.5 text-[10.5px]">
                    <div className="font-bold text-amber-950 flex items-center justify-between">
                      <span>J&amp;K Department Reality Comparison:</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-700">
                      <div className="bg-white/80 p-1.5 rounded border border-amber-200">
                        <span className="text-slate-500 block">PWD Allotment Order:</span>
                        <strong className="text-amber-900 font-mono text-xs">
                          ₹{computedAsd.departmentDemandAmount.toLocaleString('en-IN')}
                        </strong>
                        <span className="text-[9.5px] text-slate-500 block">5.20% on Advertised Cost</span>
                      </div>
                      <div className="bg-white/80 p-1.5 rounded border border-amber-200">
                        <span className="text-slate-500 block">Circular Text Literal:</span>
                        <strong className="text-slate-800 font-mono text-xs">
                          ₹{computedAsd.circularTheoreticalAmount?.toLocaleString('en-IN')}
                        </strong>
                        <span className="text-[9.5px] text-slate-500 block">2.08% on Bid Price</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-amber-900 leading-tight">
                      💡 <strong>Note:</strong> Executive Engineer Allotment Orders (e.g. R&amp;B Gurez Order No. 11) enforce the <strong>PWD Allotment Order (₹{computedAsd.departmentDemandAmount.toLocaleString('en-IN')})</strong> based on Advertised Cost.
                    </p>
                  </div>
                )}

                {/* Permissible Instrument Guidance */}
                <div className="rounded bg-slate-50 border border-slate-200 p-1.5 text-[10.5px] text-slate-600 mt-1">
                  <strong className="text-slate-800">Accepted Instruments:</strong> {computedAsd.instrumentGuide}
                </div>

                {/* Warning note if any (e.g. MoRTH/NHAI e-BG strictly mandated) */}
                {computedAsd.instrumentWarning && (
                  <div className="rounded bg-rose-50 border border-rose-200 p-1.5 text-[10.5px] text-rose-800 font-medium">
                    ⚠️ {computedAsd.instrumentWarning}
                  </div>
                )}

                {computedAsd.additionalSecurityAmount > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="w-full mt-2 h-7 text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 font-semibold"
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
            label={
              !isAsd
                ? 'Reference / BG No.'
                : selectedRuleId === 'jk_pwd'
                ? 'Term Deposit / CDR No.'
                : selectedRuleId === 'morth_nhai'
                ? 'e-Bank Guarantee (e-BG) No.'
                : 'Instrument / Ref No.'
            }
            required
            hint={
              !isAsd
                ? 'e.g. 0540124BG0001'
                : selectedRuleId === 'jk_pwd'
                ? 'e.g. CDR No. 139707'
                : selectedRuleId === 'morth_nhai'
                ? 'e-BG Ref (SFMS verified)'
                : 'FDR / CDR / BG No.'
            }
          >
            <Input
              placeholder={
                !isAsd
                  ? 'BG / FDR No.'
                  : selectedRuleId === 'jk_pwd'
                  ? 'CDR No. 139707'
                  : selectedRuleId === 'morth_nhai'
                  ? 'e.g. 0540124BG0001'
                  : 'Instrument Ref No.'
              }
              value={depositForm.reference_number}
              onChange={e => setDepositForm(f => ({ ...f, reference_number: e.target.value }))}
            />
          </FieldWrapper>

          <FieldWrapper
            label={
              !isAsd
                ? 'Issuing Bank'
                : selectedRuleId === 'jk_pwd'
                ? 'Issuing Bank & Branch'
                : selectedRuleId === 'morth_nhai'
                ? 'Issuing Bank (SFMS)'
                : 'Issuing Bank & Branch'
            }
          >
            <Input
              placeholder={
                !isAsd
                  ? 'State Bank of India'
                  : selectedRuleId === 'jk_pwd'
                  ? 'e.g. J&K Bank Branch Pazalpora'
                  : selectedRuleId === 'morth_nhai'
                  ? 'e.g. State Bank of India'
                  : 'State Bank of India'
              }
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

