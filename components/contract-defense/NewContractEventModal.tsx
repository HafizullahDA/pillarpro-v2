'use client'

import { useState, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import { BOQItem } from '@/lib/types/boq'
import { ContractRecord } from '@/lib/types/contract'
import {
  ContractEvent,
  ContractEventCategory,
  ContractDefenseStatus,
  EVENT_CATEGORY_CONFIG,
} from '@/lib/types/contractDefense'
import { calculateEventDelayDays } from '@/lib/calculations/contractDefense'

interface NewContractEventModalProps {
  open: boolean
  onClose: () => void
  projects: { id: string; name: string }[]
  contracts: ContractRecord[]
  boqItems: BOQItem[]
  defaultProjectId?: string
  onSuccess: (event: ContractEvent) => void
}

export function NewContractEventModal({
  open,
  onClose,
  projects,
  contracts,
  boqItems,
  defaultProjectId,
  onSuccess,
}: NewContractEventModalProps) {
  const supabase = createClient()
  const toast = useToast()
  const [loading, setLoading] = useState(false)

  const [projectId, setProjectId] = useState<string>(defaultProjectId || projects[0]?.id || '')
  const [contractId, setContractId] = useState<string>('')
  const [eventNumber, setEventNumber] = useState(`CE-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`)
  const [eventType, setEventType] = useState<ContractEventCategory>('site_not_handed_over')
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0])
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')
  const [location, setLocation] = useState('')
  const [affectedBoqIds, setAffectedBoqIds] = useState<string[]>([])
  const [affectedActivities, setAffectedActivities] = useState('')
  const [description, setDescription] = useState('')
  const [cause, setCause] = useState('')
  const [responsibleParty, setResponsibleParty] = useState(EVENT_CATEGORY_CONFIG.site_not_handed_over.defaultParty)
  const [impact, setImpact] = useState('')
  const [labourAffected, setLabourAffected] = useState('')
  const [machineryAffected, setMachineryAffected] = useState('')
  const [materialAffected, setMaterialAffected] = useState('')
  const [financialImpact, setFinancialImpact] = useState('')
  const [eotRelevance, setEotRelevance] = useState(true)
  const [eotClause, setEotClause] = useState('Clause 5 (Delay and Extension of Time)')
  const [claimRelevance, setClaimRelevance] = useState(false)
  const [claimHeads, setClaimHeads] = useState('')
  const [status, setStatus] = useState<ContractDefenseStatus>('OPEN')
  const [remarks, setRemarks] = useState('')

  // Filtered context
  const projectContracts = useMemo(() => {
    return contracts.filter(c => c.project_id === projectId)
  }, [contracts, projectId])

  const projectBOQ = useMemo(() => {
    return boqItems.filter(b => b.project_id === projectId)
  }, [boqItems, projectId])

  const calculatedDays = useMemo(() => {
    return calculateEventDelayDays(startDate, endDate || null)
  }, [startDate, endDate])

  const handleCategoryChange = (cat: ContractEventCategory) => {
    setEventType(cat)
    const config = EVENT_CATEGORY_CONFIG[cat]
    if (config) {
      setResponsibleParty(config.defaultParty)
      if (!description.trim()) {
        setDescription(config.neutralTerm)
      }
    }
  }

  const handleToggleBOQItem = (id: string) => {
    setAffectedBoqIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim() || !eventNumber.trim()) {
      toast.showToast('Please provide event number and detailed factual description.', 'error')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Fetch org id from project
      const { data: projData } = await supabase
        .from('projects')
        .select('organization_id')
        .eq('id', projectId)
        .single()

      if (!projData?.organization_id) throw new Error('Project organization not found')

      const { data, error } = await supabase
        .from('contract_events')
        .insert({
          organization_id: projData.organization_id,
          project_id: projectId,
          contract_id: contractId || projectContracts[0]?.id || null,
          event_number: eventNumber.trim(),
          event_type: eventType,
          event_date: eventDate,
          start_date: startDate,
          end_date: endDate || null,
          location: location.trim() || null,
          affected_boq_items: affectedBoqIds,
          affected_activities: affectedActivities.trim() || null,
          description: description.trim(),
          cause: cause.trim() || null,
          responsible_party: responsibleParty.trim() || null,
          impact: impact.trim() || null,
          estimated_delay_days: calculatedDays,
          actual_delay_days: endDate ? calculatedDays : 0,
          labour_affected: labourAffected.trim() || null,
          machinery_affected: machineryAffected.trim() || null,
          material_affected: materialAffected.trim() || null,
          financial_impact: parseFloat(financialImpact) || 0,
          eot_relevance: eotRelevance,
          eot_clause: eotRelevance ? eotClause.trim() : null,
          claim_relevance: claimRelevance,
          claim_heads: claimRelevance ? claimHeads.trim() : null,
          status,
          remarks: remarks.trim() || null,
          created_by: user?.id,
        })
        .select('*, projects(name, agency_name), contracts(agreement_number, contract_name)')
        .single()

      if (error) throw error

      toast.showToast(`Contract Event ${eventNumber} recorded successfully in Contract Defense.`, 'success')
      onSuccess(data as ContractEvent)
      onClose()
    } catch (err: any) {
      console.error('Failed to create contract event:', err)
      toast.showToast(err.message || 'Failed to record event.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Log Contract Event (Contract Defense Ledger)">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs max-h-[82vh] overflow-y-auto pr-1">
        {/* Neutral Factual Notice Banner */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700">
          <p className="font-semibold text-slate-900">Contractual Event Standard (CPWD / PWD GCC)</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Use neutral, factual terminology. Document verified ground realities without presumptive blame to create an unassailable record for EOT and claim defense.
          </p>
        </div>

        {/* Project & Contract Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Project *</label>
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
              required
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Contract Agreement</label>
            <select
              value={contractId}
              onChange={e => setContractId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
            >
              <option value="">-- Primary Contract Master --</option>
              {projectContracts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.agreement_number || 'Agreement'}: {c.contract_title || c.nit_number || 'Contract'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Event Number & Category */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            label="Event Reference Number *"
            value={eventNumber}
            onChange={e => setEventNumber(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Event Category *</label>
            <select
              value={eventType}
              onChange={e => handleCategoryChange(e.target.value as ContractEventCategory)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none font-medium"
            >
              {Object.entries(EVENT_CATEGORY_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Responsible Party / Head</label>
            <input
              type="text"
              value={responsibleParty}
              onChange={e => setResponsibleParty(e.target.value)}
              placeholder="e.g. Department / Employer, PDD, Revenue"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Dates & Location */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            label="Event Notification Date *"
            type="date"
            value={eventDate}
            onChange={e => setEventDate(e.target.value)}
            required
          />
          <Input
            label="Start Date *"
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            required
          />
          <Input
            label="End Date (if resolved)"
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
          <Input
            label="Location / Chainage"
            placeholder="e.g. Ch 12+400 to 13+100 / Pier P2"
            value={location}
            onChange={e => setLocation(e.target.value)}
          />
        </div>

        {/* Description & Factual Cause */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Factual Event Description *</label>
          <textarea
            rows={2}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Neutral factual account of the ground condition, instruction, or impediment..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Proximate Cause</label>
            <input
              type="text"
              value={cause}
              onChange={e => setCause(e.target.value)}
              placeholder="e.g. Forest clearance pending approval from MOEF"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Affected Work / Activity</label>
            <input
              type="text"
              value={affectedActivities}
              onChange={e => setAffectedActivities(e.target.value)}
              placeholder="e.g. Subgrade compaction, Piling, Pier Cap casting"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* BOQ Item Linking */}
        {projectBOQ.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Affected BOQ Items ({affectedBoqIds.length} Selected)
            </label>
            <div className="max-h-28 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50 space-y-1">
              {projectBOQ.map(b => {
                const isSelected = affectedBoqIds.includes(b.id)
                return (
                  <label key={b.id} className="flex items-center gap-2 text-[11px] cursor-pointer hover:bg-white p-1 rounded">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleBOQItem(b.id)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-mono font-bold text-slate-800">{b.item_number}:</span>
                    <span className="text-slate-600 truncate">{b.description} ({b.unit})</span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {/* Impact Breakdown: Labour, Machinery, Material, Financial */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
          <span className="text-xs font-bold text-slate-900 block">Ground Impact &amp; Loss Quantification</span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input
              label="Labour Affected / Idled"
              placeholder="e.g. 20 Barbenders, 35 Masons standing idle"
              value={labourAffected}
              onChange={e => setLabourAffected(e.target.value)}
            />
            <Input
              label="Machinery Affected / Stood Down"
              placeholder="e.g. 1x Piling Rig, 2x Transit Mixers"
              value={machineryAffected}
              onChange={e => setMachineryAffected(e.target.value)}
            />
            <Input
              label="Material Affected"
              placeholder="e.g. Ready Mix batching standing, cement"
              value={materialAffected}
              onChange={e => setMaterialAffected(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <Input
              label="Estimated Financial Impact (₹ Idling / Overhead Loss)"
              type="number"
              placeholder="e.g. 150000"
              value={financialImpact}
              onChange={e => setFinancialImpact(e.target.value)}
            />
            <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
              <span className="text-slate-500 text-[11px]">Calculated Event Duration:</span>
              <span className="font-mono font-bold text-indigo-700 text-sm">{calculatedDays} Days</span>
            </div>
          </div>
        </div>

        {/* Contractual Relevance: EOT & Claims */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl">
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
              <input
                type="checkbox"
                checked={eotRelevance}
                onChange={e => setEotRelevance(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Relevant for Extension of Time (EOT)
            </label>
            {eotRelevance && (
              <Input
                label="GCC Clause Reference"
                value={eotClause}
                onChange={e => setEotClause(e.target.value)}
                placeholder="Clause 5 CPWD / PWD GCC"
              />
            )}
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
              <input
                type="checkbox"
                checked={claimRelevance}
                onChange={e => setClaimRelevance(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Commercial / Cost Claim Relevance
            </label>
            {claimRelevance && (
              <Input
                label="Claim Heads / Grounds"
                value={claimHeads}
                onChange={e => setClaimHeads(e.target.value)}
                placeholder="Idling charges, Hudson formula, site overheads"
              />
            )}
          </div>
        </div>

        {/* Status & Remarks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Defense Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as ContractDefenseStatus)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
            >
              <option value="OPEN">OPEN (Active Event / Ongoing)</option>
              <option value="UNDER_REVIEW">UNDER REVIEW (Noticed / Department Inspecting)</option>
              <option value="RESOLVED">RESOLVED (Obstruction Cleared)</option>
              <option value="CLOSED">CLOSED (Settled &amp; Accounted)</option>
              <option value="DISPUTED">DISPUTED (Contested by Department)</option>
            </select>
          </div>

          <Input
            label="Internal Remarks / Follow-up Notes"
            placeholder="Next steps, site diary cross-ref, upcoming inspection..."
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
            {loading ? 'Recording Event...' : 'Record Contract Event'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
