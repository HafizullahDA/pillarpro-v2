'use client'

import { useState } from 'react'
import { EvidenceCompletenessSummary } from '@/lib/types/evidence'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface EvidenceCompletenessBadgeProps {
  completeness: EvidenceCompletenessSummary
  targetTitle?: string
  onAttachEvidence?: () => void
  size?: 'sm' | 'md'
}

export function EvidenceCompletenessBadge({
  completeness,
  targetTitle = 'Contract Record',
  onAttachEvidence,
  size = 'md',
}: EvidenceCompletenessBadgeProps) {
  const [modalOpen, setModalOpen] = useState(false)

  const { totalRequired, fulfilledCount, ratioString, percentage, isComplete, items } = completeness

  const badgeColor = isComplete
    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
    : percentage >= 50
    ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
    : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'

  const indicatorDot = isComplete
    ? 'bg-emerald-500'
    : percentage >= 50
    ? 'bg-amber-500'
    : 'bg-rose-500'

  return (
    <>
      <button
        type="button"
        onClick={e => {
          e.stopPropagation()
          setModalOpen(true)
        }}
        className={`inline-flex items-center gap-1.5 rounded-lg border font-mono font-bold transition-all cursor-pointer ${badgeColor} ${
          size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
        }`}
        title="Click to view evidence completeness checklist"
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${indicatorDot}`} />
        <span>Evidence: {ratioString}</span>
        <span className="text-[10px] font-semibold opacity-80">({percentage}%)</span>
      </button>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Evidence Completeness: ${targetTitle}`}
      >
        <div className="space-y-4 text-left text-xs text-slate-700">
          {/* Summary Banner */}
          <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
            isComplete
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : percentage >= 50
              ? 'bg-amber-50 border-amber-200 text-amber-950'
              : 'bg-rose-50 border-rose-200 text-rose-950'
          }`}>
            <div>
              <p className="font-bold text-sm">
                Evidence Completeness: {ratioString} Proofs Established ({percentage}%)
              </p>
              <p className="text-[11px] mt-0.5 opacity-90">
                {isComplete
                  ? 'All standard contractual evidentiary proofs are documented contemporaneously.'
                  : `${totalRequired - fulfilledCount} key documentary proof${totalRequired - fulfilledCount === 1 ? '' : 's'} pending attachment for a robust claim defense.`}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-2xl font-black font-mono">{percentage}%</span>
            </div>
          </div>

          {/* Checklist of Evidentiary Proofs */}
          <div className="space-y-2">
            <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
              Documentary Proof Checklist (Works Manual &amp; Claims Defense)
            </p>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
              {items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-3 flex items-start justify-between gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                        item.fulfilled
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {item.fulfilled ? '✓' : '✕'}
                    </span>
                    <div>
                      <p className={`font-semibold ${item.fulfilled ? 'text-slate-900' : 'text-slate-700'}`}>
                        {item.label}
                      </p>
                      {item.fulfilled && item.matchedEvidenceTitle ? (
                        <p className="text-[11px] text-blue-600 font-medium mt-0.5 flex items-center gap-1">
                          <span className="font-mono text-slate-500">[{item.matchedEvidenceNumber || 'Attached'}]</span>
                          <span>{item.matchedEvidenceTitle}</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400 mt-0.5 italic">
                          Pending evidence attachment ({item.types.join(' or ')})
                        </p>
                      )}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 ${
                      item.fulfilled
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {item.fulfilled ? 'Documented' : 'Missing'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            {onAttachEvidence ? (
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                onClick={() => {
                  setModalOpen(false)
                  onAttachEvidence()
                }}
              >
                + Attach Supporting Evidence
              </Button>
            ) : <div />}

            <Button
              size="sm"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
