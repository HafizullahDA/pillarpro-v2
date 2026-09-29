'use client'

import { useState, useMemo, useEffect } from 'react'
import { formatINR, formatDate } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import {
  ContractVariation,
  VariationType,
  VariationStatus,
} from '@/lib/types/variations'
import { BOQItem } from '@/lib/types/boq'
import { ContractRecord } from '@/lib/types/contract'
import {
  aggregateVariationMetrics,
  filterVariations,
} from '@/lib/calculations/variations'
import { VariationStatusBadge } from './VariationStatusBadge'
import { VariationTypeBadge } from './VariationTypeBadge'
import { ContractValueBreakdownCard } from './ContractValueBreakdownCard'
import { NewVariationModal } from './NewVariationModal'
import { VariationDetailModal } from './VariationDetailModal'
import { VariationPrintOrderModal } from './VariationPrintOrderModal'

interface Props {
  initialVariations: ContractVariation[]
  projects: Array<{ id: string; name: string; awarded_amount?: number | null }>
  contracts: ContractRecord[]
  boqItems: BOQItem[]
  selectedProjectId?: string
}

export function VariationsMasterView({
  initialVariations = [],
  projects = [],
  contracts = [],
  boqItems = [],
  selectedProjectId = 'all',
}: Props) {
  const [variations, setVariations] = useState<ContractVariation[]>(initialVariations)
  const [projectId, setProjectId] = useState<string>(selectedProjectId)
  const [typeFilter, setTypeFilter] = useState<VariationType | 'ALL'>('ALL')
  const [statusFilter, setStatusFilter] = useState<VariationStatus | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (selectedProjectId) {
      setProjectId(selectedProjectId)
    }
  }, [selectedProjectId])

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [inspectingVariation, setInspectingVariation] = useState<ContractVariation | null>(null)
  const [printingVariation, setPrintingVariation] = useState<ContractVariation | null>(null)

  // Determine current project's original contract value
  const originalContractValue = useMemo(() => {
    if (projectId === 'all') {
      return projects.reduce((sum, p) => sum + Number(p.awarded_amount || 0), 0)
    }
    const currentProj = projects.find(p => p.id === projectId)
    return Number(currentProj?.awarded_amount || 0)
  }, [projectId, projects])

  // Variations filtered for summary calculation
  const projectVariations = useMemo(() => {
    if (projectId === 'all') return variations
    return variations.filter(v => v.project_id === projectId)
  }, [variations, projectId])

  // 6-stage metric summary
  const summary = useMemo(() => {
    return aggregateVariationMetrics(projectVariations, originalContractValue)
  }, [projectVariations, originalContractValue])

  // Table filtered items
  const filteredItems = useMemo(() => {
    return filterVariations(variations, {
      query: searchQuery,
      type: typeFilter,
      status: statusFilter,
      projectId,
    })
  }, [variations, searchQuery, typeFilter, statusFilter, projectId])

  const handleCreated = (newVar: ContractVariation) => {
    setVariations(prev => [newVar, ...prev])
  }

  const handleUpdated = (updatedVar: ContractVariation) => {
    setVariations(prev => prev.map(v => (v.id === updatedVar.id ? updatedVar : v)))
    setInspectingVariation(updatedVar)
  }

  return (
    <div className="space-y-6">
      {/* Top Bar with Project Selector & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Variations, Deviations &amp; Extra Items Master</span>
            <span className="text-xs bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full font-bold">
              Clause 12
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            Authoritative tracking of scope, quantity deviations, substitutions and new extra items without altering tender baseline.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {projects.length > 1 && (
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600"
            >
              <option value="all">All Projects Portfolio</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <Button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-1.5 font-bold shadow-sm"
          >
            <span>+</span>
            <span>New Variation Proposal</span>
          </Button>
        </div>
      </div>

      {/* 6-Stage Government Contract Value Reconciliation Card */}
      <ContractValueBreakdownCard
        summary={summary}
        projectName={
          projectId !== 'all'
            ? projects.find(p => p.id === projectId)?.name
            : 'All Projects Combined'
        }
      />

      {/* Filters & Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        {/* Type Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(['ALL', 'DEVIATION', 'VARIATION', 'EXTRA_ITEM', 'SUBSTITUTED_ITEM'] as const).map(
            t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  typeFilter === t
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t === 'ALL'
                  ? 'All Types'
                  : t === 'DEVIATION'
                  ? 'Deviations'
                  : t === 'VARIATION'
                  ? 'Variations'
                  : t === 'EXTRA_ITEM'
                  ? 'Extra Items'
                  : 'Substituted'}
              </button>
            )
          )}
        </div>

        {/* Status Dropdown & Search */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 border border-slate-300 rounded-xl bg-white text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PROPOSED">PROPOSED (Unapproved)</option>
            <option value="UNDER_APPROVAL">UNDER_APPROVAL</option>
            <option value="APPROVED">APPROVED (Sanctioned)</option>
            <option value="EXECUTED">EXECUTED</option>
            <option value="BILLED">BILLED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
          <input
            type="text"
            placeholder="Search reference, description, authority..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs text-slate-900 w-full sm:w-64 focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* Variations Register Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3">Reference / Date</th>
                <th className="p-3">Type</th>
                <th className="p-3">Item &amp; Description</th>
                <th className="p-3 text-right">Original Qty</th>
                <th className="p-3 text-right">Proposed Qty</th>
                <th className="p-3 text-right">Diff Qty</th>
                <th className="p-3 text-right">Proposed Amount</th>
                <th className="p-3 text-right">Approved Amount</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length > 0 ? (
                filteredItems.map(item => {
                  const isApproved = ['APPROVED', 'EXECUTED', 'BILLED', 'CLOSED'].includes(item.status)
                  const diff = item.difference_quantity

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => setInspectingVariation(item)}
                    >
                      <td className="p-3 font-mono">
                        <span className="font-bold text-slate-900 block">
                          {item.reference_number}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {formatDate(item.instruction_date)}
                        </span>
                      </td>
                      <td className="p-3">
                        <VariationTypeBadge type={item.type} showClause={false} />
                      </td>
                      <td className="p-3 max-w-xs">
                        <span className="font-semibold text-slate-800 block truncate">
                          {item.proposed_item_code ? `[${item.proposed_item_code}] ` : ''}
                          {item.proposed_item_description}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate block">
                          Auth: {item.instruction_authority}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600">
                        {item.original_quantity} {item.proposed_unit}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        {item.proposed_quantity} {item.proposed_unit}
                      </td>
                      <td className="p-3 text-right font-mono font-semibold">
                        <span className={diff < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                          {diff > 0 ? '+' : ''}{diff} {item.proposed_unit}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-800">
                        {formatINR(item.proposed_amount)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold">
                        {isApproved ? (
                          <span className={item.is_deletion ? 'text-rose-700' : 'text-emerald-800'}>
                            {item.is_deletion ? '-' : '+'}{formatINR(item.approved_amount)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal italic">Pending</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <VariationStatusBadge status={item.status} />
                      </td>
                      <td className="p-3 text-right space-x-1" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setInspectingVariation(item)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold"
                        >
                          Inspect
                        </button>
                        <button
                          onClick={() => setPrintingVariation(item)}
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-semibold"
                          title="Print Formal Variation Order"
                        >
                          VO
                        </button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 italic">
                    No variations or deviations found matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <NewVariationModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSuccess={handleCreated}
        projects={projects}
        contracts={contracts}
        boqItems={boqItems}
        preselectedProjectId={projectId}
      />

      <VariationDetailModal
        variation={inspectingVariation}
        isOpen={!!inspectingVariation}
        onClose={() => setInspectingVariation(null)}
        onUpdate={handleUpdated}
        onPrint={v => {
          setInspectingVariation(null)
          setPrintingVariation(v)
        }}
      />

      <VariationPrintOrderModal
        variation={printingVariation}
        isOpen={!!printingVariation}
        onClose={() => setPrintingVariation(null)}
      />
    </div>
  )
}
