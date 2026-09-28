'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ContractRecord } from '@/lib/types/contract'
import { createClient } from '@/lib/supabase/client'
import { contractSchema, ContractFormData } from '@/lib/validations/contract'

interface EditContractModalProps {
  open: boolean
  onClose: () => void
  contract: Partial<ContractRecord>
  projectId: string
  onSaved: (savedContract: ContractRecord) => void
}

export function EditContractModal({
  open,
  onClose,
  contract,
  projectId,
  onSaved,
}: EditContractModalProps) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'general' | 'dates' | 'securities' | 'clauses'>('general')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<ContractFormData>({
    employer_name: contract.employer_name || '',
    division: contract.division || '',
    circle: contract.circle || '',
    contracting_authority: contract.contracting_authority || 'Executive Engineer',
    contractor_name: contract.contractor_name || '',

    agreement_number: contract.agreement_number || '',
    work_order_number: contract.work_order_number || '',
    nit_number: contract.nit_number || '',
    contract_title: contract.contract_title || '',

    contract_type: contract.contract_type || 'Item Rate',
    tender_type: contract.tender_type || 'Open Tender',

    estimated_cost: Number(contract.estimated_cost) || 0,
    awarded_amount: Number(contract.awarded_amount) || 0,

    award_date: contract.award_date || '',
    agreement_date: contract.agreement_date || '',
    work_commencement_date: contract.work_commencement_date || '',
    original_completion_date: contract.original_completion_date || '',
    current_completion_date: contract.current_completion_date || '',
    original_contract_period_months: contract.original_contract_period_months ?? null,
    original_contract_period_days: contract.original_contract_period_days ?? null,

    dlp_months: contract.dlp_months ?? 12,
    dlp_start_date: contract.dlp_start_date || '',
    dlp_end_date: contract.dlp_end_date || '',

    earnest_money_deposit: Number(contract.earnest_money_deposit) || 0,
    performance_security_amount: Number(contract.performance_security_amount) || 0,
    performance_security_percent: Number(contract.performance_security_percent) || 5,
    security_deposit_amount: Number(contract.security_deposit_amount) || 0,
    security_deposit_percent: Number(contract.security_deposit_percent) || 2.5,
    retention_percentage: Number(contract.retention_percentage) || 5,

    contractor_gstin: contract.contractor_gstin || '',
    employer_gstin: contract.employer_gstin || '',
    gst_rate_percent: Number(contract.gst_rate_percent) || 18,
    gst_treatment: (contract.gst_treatment as any) || 'exclusive',

    liquidated_damages_percent_per_week: Number(contract.liquidated_damages_percent_per_week) || 0.5,
    liquidated_damages_max_cap_percent: Number(contract.liquidated_damages_max_cap_percent) || 10,
    ld_provisions_notes: contract.ld_provisions_notes || '',

    eot_clause: contract.eot_clause || 'Clause 5 CPWD / PWD GCC',
    eot_notice_days: Number(contract.eot_notice_days) || 14,
    eot_provisions_notes: contract.eot_provisions_notes || '',

    escalation_applicable: Boolean(contract.escalation_applicable),
    escalation_clause: contract.escalation_clause || 'Clause 10CC / 10CA',
    escalation_notes: contract.escalation_notes || '',

    variation_limit_percent: Number(contract.variation_limit_percent) || 25,
    variation_clause: contract.variation_clause || 'Clause 12 CPWD / PWD GCC',
    variation_notes: contract.variation_notes || '',

    payment_terms_frequency: contract.payment_terms_frequency || 'monthly',
    payment_terms_notes: contract.payment_terms_notes || '',

    gcc_type: contract.gcc_type || 'CPWD GCC 2020 / 2024',
    gcc_edition: contract.gcc_edition || '',
    scc_notes: contract.scc_notes || '',

    status: (contract.status as any) || 'active',
    notes: contract.notes || '',
  })

  const handleChange = (field: keyof ContractFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Zod validation
    const result = contractSchema.safeParse(formData)
    if (!result.success) {
      const firstError = result.error.issues?.[0]?.message || 'Please check the form for errors'
      setError(firstError)
      return
    }

    setSaving(true)
    try {
      const payload: any = {
        ...result.data,
        project_id: projectId,
        updated_at: new Date().toISOString(),
      }

      // Clean empty string dates to null
      const dateFields = [
        'award_date',
        'agreement_date',
        'work_commencement_date',
        'original_completion_date',
        'current_completion_date',
        'dlp_start_date',
        'dlp_end_date',
      ]
      dateFields.forEach(f => {
        if (!payload[f]) payload[f] = null
      })

      let res
      if (contract.id) {
        res = await supabase
          .from('contracts')
          .update(payload)
          .eq('id', contract.id)
          .select()
          .single()
      } else {
        res = await supabase
          .from('contracts')
          .insert(payload)
          .select()
          .single()
      }

      if (res.error) throw res.error

      onSaved(res.data as ContractRecord)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save contract details')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={contract.id ? 'Edit Contract Master' : 'Create Contract Master'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-3.5 py-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'general'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            1. Parties & IDs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dates')}
            className={`px-3.5 py-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'dates'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            2. Values & Dates
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('securities')}
            className={`px-3.5 py-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'securities'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            3. Securities & GST
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('clauses')}
            className={`px-3.5 py-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'clauses'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            4. Clauses & GCC/SCC
          </button>
        </div>

        {/* TAB 1: General & Parties */}
        {activeTab === 'general' && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Agreement Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 04/EE/R&B/2025-26"
                  value={formData.agreement_number}
                  onChange={e => handleChange('agreement_number', e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Work Order Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. WO/PWD/4412/2025"
                  value={formData.work_order_number || ''}
                  onChange={e => handleChange('work_order_number', e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  NIT / e-Tender Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. e-NIT No. 14 of 2025-26"
                  value={formData.nit_number || ''}
                  onChange={e => handleChange('nit_number', e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Contract Title / Package Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Construction of 4-Lane Bypass (Km 0 to 12)"
                  value={formData.contract_title || ''}
                  onChange={e => handleChange('contract_title', e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Department / Employer *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Public Works Department / CPWD / NHAI"
                  value={formData.employer_name}
                  onChange={e => handleChange('employer_name', e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Contractor Legal Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. M/s Valley Infrastructure Corp"
                  value={formData.contractor_name}
                  onChange={e => handleChange('contractor_name', e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Division</label>
                <input
                  type="text"
                  placeholder="e.g. R&B Division Baramulla"
                  value={formData.division || ''}
                  onChange={e => handleChange('division', e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Circle</label>
                <input
                  type="text"
                  placeholder="e.g. North Kashmir Circle"
                  value={formData.circle || ''}
                  onChange={e => handleChange('circle', e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Contracting Authority
                </label>
                <input
                  type="text"
                  placeholder="e.g. Executive Engineer"
                  value={formData.contracting_authority || ''}
                  onChange={e => handleChange('contracting_authority', e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Contract Type
                </label>
                <select
                  value={formData.contract_type}
                  onChange={e => handleChange('contract_type', e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Item Rate">Item Rate (Schedule / DSR)</option>
                  <option value="Percentage Rate">Percentage Rate (Above/Below)</option>
                  <option value="Lump Sum">Lump Sum</option>
                  <option value="EPC">EPC (Engineering, Procurement, Construction)</option>
                  <option value="HAM">HAM (Hybrid Annuity Model)</option>
                  <option value="Item Rate cum EPC">Item Rate cum EPC</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tender Type</label>
                <select
                  value={formData.tender_type}
                  onChange={e => handleChange('tender_type', e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Open Tender">Open Tender (National)</option>
                  <option value="Limited Tender">Limited Tender</option>
                  <option value="Single Tender / Nomination">Single Tender / Nomination</option>
                  <option value="Two-Cover System">Two-Cover (Tech + Fin)</option>
                  <option value="EOI / Global">EOI / Global</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Contract Status</label>
                <select
                  value={formData.status}
                  onChange={e => handleChange('status', e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="active">Active Execution</option>
                  <option value="completed">Completed / In DLP</option>
                  <option value="suspended">Suspended</option>
                  <option value="foreclosed">Foreclosed</option>
                  <option value="terminated">Terminated</option>
                  <option value="in_arbitration">In Arbitration</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Values & Dates */}
        {activeTab === 'dates' && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Contract Estimated Cost (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.estimated_cost ?? ''}
                  onChange={e => handleChange('estimated_cost', e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Accepted Contract Value / Awarded Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={formData.awarded_amount}
                  onChange={e => handleChange('awarded_amount', e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Award / LOA Date
                </label>
                <input
                  type="date"
                  value={formData.award_date || ''}
                  onChange={e => handleChange('award_date', e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Agreement Signing Date
                </label>
                <input
                  type="date"
                  value={formData.agreement_date || ''}
                  onChange={e => handleChange('agreement_date', e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Work Commencement (SDOS)
                </label>
                <input
                  type="date"
                  value={formData.work_commencement_date || ''}
                  onChange={e => handleChange('work_commencement_date', e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Original Completion (SDOC)
                </label>
                <input
                  type="date"
                  value={formData.original_completion_date || ''}
                  onChange={e => handleChange('original_completion_date', e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Current Extended Completion
                </label>
                <input
                  type="date"
                  value={formData.current_completion_date || ''}
                  onChange={e => handleChange('current_completion_date', e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Contract Period (Months)
                </label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="e.g. 18"
                  value={formData.original_contract_period_months ?? ''}
                  onChange={e => handleChange('original_contract_period_months', e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  DLP Duration (Months)
                </label>
                <input
                  type="number"
                  placeholder="12"
                  value={formData.dlp_months ?? 12}
                  onChange={e => handleChange('dlp_months', e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  DLP Scheduled End Date
                </label>
                <input
                  type="date"
                  value={formData.dlp_end_date || ''}
                  onChange={e => handleChange('dlp_end_date', e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Securities, Deposits & GST */}
        {activeTab === 'securities' && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  EMD Deposited (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.earnest_money_deposit ?? ''}
                  onChange={e => handleChange('earnest_money_deposit', e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Performance Security / PBG (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.performance_security_amount ?? ''}
                  onChange={e => handleChange('performance_security_amount', e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  PBG Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="5.0"
                  value={formData.performance_security_percent ?? 5}
                  onChange={e => handleChange('performance_security_percent', e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Total Security Deposit Required (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.security_deposit_amount ?? ''}
                  onChange={e => handleChange('security_deposit_amount', e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Total SD Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="2.5"
                  value={formData.security_deposit_percent ?? 2.5}
                  onChange={e => handleChange('security_deposit_percent', e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Retention Deducted per Bill (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="5.0"
                  value={formData.retention_percentage}
                  onChange={e => handleChange('retention_percentage', e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-700"
                />
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                GST & Taxation Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Contractor GSTIN
                  </label>
                  <input
                    type="text"
                    placeholder="01AAAAA0000A1Z5"
                    value={formData.contractor_gstin || ''}
                    onChange={e => handleChange('contractor_gstin', e.target.value.toUpperCase())}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Employer / Department GSTIN
                  </label>
                  <input
                    type="text"
                    placeholder="01PWDDEPT1234Z0"
                    value={formData.employer_gstin || ''}
                    onChange={e => handleChange('employer_gstin', e.target.value.toUpperCase())}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    GST Rate Applicable (%)
                  </label>
                  <input
                    type="number"
                    step="1"
                    placeholder="18"
                    value={formData.gst_rate_percent ?? 18}
                    onChange={e => handleChange('gst_rate_percent', e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Contract GST Treatment
                  </label>
                  <select
                    value={formData.gst_treatment}
                    onChange={e => handleChange('gst_treatment', e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="exclusive">Exclusive of GST (Department pays GST extra)</option>
                    <option value="inclusive">Inclusive of GST (Bid price includes GST)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Clauses & GCC/SCC */}
        {activeTab === 'clauses' && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Governing GCC Framework
                </label>
                <input
                  type="text"
                  placeholder="e.g. CPWD GCC 2020 / 2024 for Works"
                  value={formData.gcc_type || ''}
                  onChange={e => handleChange('gcc_type', e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Payment Frequency & Mode
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly Running Account Bills"
                  value={formData.payment_terms_frequency || ''}
                  onChange={e => handleChange('payment_terms_frequency', e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Liquidated Damages */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <p className="text-xs font-bold text-slate-800">
                Liquidated Damages (LD) Provisions (Clause 2)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Rate of LD (% per week of delay)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0.5"
                    value={formData.liquidated_damages_percent_per_week ?? 0.5}
                    onChange={e => handleChange('liquidated_damages_percent_per_week', e.target.value)}
                    className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Maximum LD Cap (% of contract value)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="10.0"
                    value={formData.liquidated_damages_max_cap_percent ?? 10}
                    onChange={e => handleChange('liquidated_damages_max_cap_percent', e.target.value)}
                    className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* EOT & Statutory Notice */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <p className="text-xs font-bold text-slate-800">
                Extension of Time (EOT) & Notice (Clause 5)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    EOT Governing Clause
                  </label>
                  <input
                    type="text"
                    value={formData.eot_clause || 'Clause 5 CPWD / PWD GCC'}
                    onChange={e => handleChange('eot_clause', e.target.value)}
                    className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Mandatory Delay Notice Window (Days)
                  </label>
                  <input
                    type="number"
                    placeholder="14"
                    value={formData.eot_notice_days ?? 14}
                    onChange={e => handleChange('eot_notice_days', e.target.value)}
                    className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Price Escalation & Variations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800">Price Escalation (Clause 10CC / 10CA)</span>
                  <input
                    type="checkbox"
                    checked={formData.escalation_applicable}
                    onChange={e => handleChange('escalation_applicable', e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Escalation clause notes..."
                  value={formData.escalation_clause || ''}
                  onChange={e => handleChange('escalation_clause', e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800">Variations Limit (Clause 12)</span>
                  <span className="text-[11px] text-slate-500 font-mono">Max % deviation</span>
                </div>
                <input
                  type="number"
                  placeholder="25"
                  value={formData.variation_limit_percent ?? 25}
                  onChange={e => handleChange('variation_limit_percent', e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Special Conditions of Contract (SCC) / Notes
              </label>
              <textarea
                rows={3}
                placeholder="Key special conditions, liquidated damages exemptions, departmental material issuance rules, or specific site restrictions..."
                value={formData.scc_notes || ''}
                onChange={e => handleChange('scc_notes', e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {activeTab !== 'general' && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (activeTab === 'dates') setActiveTab('general')
                  if (activeTab === 'securities') setActiveTab('dates')
                  if (activeTab === 'clauses') setActiveTab('securities')
                }}
              >
                Previous
              </Button>
            )}
            {activeTab !== 'clauses' ? (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (activeTab === 'general') setActiveTab('dates')
                  if (activeTab === 'dates') setActiveTab('securities')
                  if (activeTab === 'securities') setActiveTab('clauses')
                }}
              >
                Next Step
              </Button>
            ) : (
              <Button type="submit" size="sm" loading={saving}>
                Save Contract Master
              </Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  )
}
