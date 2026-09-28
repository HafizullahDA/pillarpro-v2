'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { formatINR, formatDate } from '@/lib/format'
import { TimelineNode, ContractDefenseStatus } from '@/lib/types/contractDefense'

interface ContractTimelineViewProps {
  timelineNodes: TimelineNode[]
  onSelectNode?: (node: TimelineNode) => void
}

export function ContractTimelineView({
  timelineNodes,
  onSelectNode,
}: ContractTimelineViewProps) {
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterCriticalOnly, setFilterCriticalOnly] = useState(false)

  const filteredNodes = timelineNodes.filter(node => {
    if (filterCategory !== 'all' && node.category !== filterCategory) return false
    if (filterCriticalOnly && !node.isCritical) return false
    return true
  })

  const categories = Array.from(new Set(timelineNodes.map(n => n.category)))

  return (
    <div className="space-y-4">
      {/* Filter Strip */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700">Chronological Events:</span>
          <span className="font-mono bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full font-semibold">
            {filteredNodes.length} / {timelineNodes.length} Nodes
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 focus:outline-none"
          >
            <option value="all">All Event Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
            <input
              type="checkbox"
              checked={filterCriticalOnly}
              onChange={e => setFilterCriticalOnly(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            EOT / Claims Critical Only
          </label>
        </div>
      </div>

      {/* Visual Timeline Stream */}
      {filteredNodes.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
          No chronological events or hindrances found matching the selected filters.
        </div>
      ) : (
        <div className="relative pl-6 md:pl-8 space-y-6 before:absolute before:inset-0 before:left-3 md:before:left-4 before:w-0.5 before:bg-slate-200">
          {filteredNodes.map((node, idx) => {
            const isEvent = node.type === 'event'
            return (
              <div key={node.id} className="relative group">
                {/* Timeline Dot Marker */}
                <div
                  className={`absolute -left-6 md:-left-8 top-1.5 w-6 h-6 md:w-8 md:h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold shadow-xs transition-transform group-hover:scale-110 ${
                    node.status === 'OPEN'
                      ? 'bg-rose-50 border-rose-500 text-rose-700'
                      : node.status === 'UNDER_REVIEW'
                      ? 'bg-amber-50 border-amber-500 text-amber-700'
                      : 'bg-emerald-50 border-emerald-500 text-emerald-700'
                  }`}
                >
                  {idx + 1}
                </div>

                {/* Timeline Event Card */}
                <div
                  onClick={() => onSelectNode && onSelectNode(node)}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer space-y-2.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">{formatDate(node.date)}</span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {node.categoryLabel}
                        </span>
                        {node.isCritical && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                            EOT Relevant
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">{node.title}</h4>
                      {node.subtitle && <p className="text-xs text-slate-500">{node.subtitle}</p>}
                    </div>

                    <div className="text-right flex flex-col items-end gap-1">
                      <Badge
                        label={node.status}
                        variant={
                          node.status === 'OPEN'
                            ? 'danger'
                            : node.status === 'UNDER_REVIEW'
                            ? 'warning'
                            : node.status === 'RESOLVED' || node.status === 'CLOSED'
                            ? 'success'
                            : 'neutral'
                        }
                      />
                      {node.durationDays && node.durationDays > 0 ? (
                        <span className="text-[11px] font-mono font-bold text-rose-600">
                          {node.durationDays} Days Delay
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                    {node.description}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    <span>
                      Responsible: <strong className="text-slate-800">{node.responsibleParty}</strong>
                    </span>
                    {node.financialImpact && node.financialImpact > 0 ? (
                      <span>
                        Loss Exposure: <strong className="text-rose-600 font-mono">{formatINR(node.financialImpact)}</strong>
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
