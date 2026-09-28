'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  CorrespondenceRecord,
  CORRESPONDENCE_CATEGORY_CONFIG,
} from '@/lib/types/correspondence'
import { formatDate } from '@/lib/format'
import { DeadlineBadge } from './DeadlineBadge'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'

interface CorrespondenceDetailModalProps {
  open: boolean
  onClose: () => void
  record: CorrespondenceRecord | null
  onUpdated?: (updated: CorrespondenceRecord) => void
}

export function CorrespondenceDetailModal({
  open,
  onClose,
  record,
  onUpdated,
}: CorrespondenceDetailModalProps) {
  const supabase = createClient()
  const { success, error: toastError } = useToast()
  const [updating, setUpdating] = useState(false)

  if (!record) return null

  const categoryConfig = CORRESPONDENCE_CATEGORY_CONFIG[record.category] || CORRESPONDENCE_CATEGORY_CONFIG.CORRESPONDENCE

  const handleMarkResponded = async () => {
    setUpdating(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('contract_correspondence')
        .update({
          status: 'RESPONDED',
          responded_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq('id', record.id)
        .select()
        .single()

      if (error) throw error

      success(`Communication marked as Responded on ${today}.`)
      onUpdated?.(data as CorrespondenceRecord)
      onClose()
    } catch (err: any) {
      toastError(err?.message || 'Failed to update response status.')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Communication: ${record.letter_number}`}
    >
      <div className="space-y-4 text-left text-xs text-slate-700">
        {/* Header Ribbon */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-slate-900 font-mono">{record.letter_number}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${categoryConfig.badgeColor}`}>
                {categoryConfig.icon} {categoryConfig.label}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                record.direction === 'INCOMING'
                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                  : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
              }`}>
                {record.direction === 'INCOMING' ? '↓ Incoming' : '↑ Outgoing'}
              </span>
              <span className="text-[10px] font-mono text-slate-400">Ref: {record.reference_number}</span>
            </div>
            <h3 className="font-semibold text-slate-900 text-sm mt-1">{record.subject}</h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {record.attachment_url && (
              <a
                href={record.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center gap-1"
              >
                <span>View Attachment</span>
                <span>&rarr;</span>
              </a>
            )}
          </div>
        </div>

        {/* Sender / Recipient / Date Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div>
            <p className="text-slate-500 font-medium">Sender</p>
            <p className="font-semibold text-slate-900 truncate" title={record.sender}>{record.sender}</p>
          </div>
          <div>
            <p className="text-slate-500 font-medium">Recipient</p>
            <p className="font-semibold text-slate-900 truncate" title={record.recipient}>{record.recipient}</p>
          </div>
          <div>
            <p className="text-slate-500 font-medium">Date on Letter</p>
            <p className="font-semibold text-slate-900">{formatDate(record.date)}</p>
          </div>
          <div>
            <p className="text-slate-500 font-medium">Status</p>
            <Badge label={record.status.replace(/_/g, ' ')} variant="neutral" />
          </div>
        </div>

        {/* Detailed Description */}
        {record.description && (
          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
            <p className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider">Summary of Communication</p>
            <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{record.description}</p>
          </div>
        )}

        {/* Transparent Deadline & Response Tracking Box */}
        {record.response_required && (
          <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">
                Contractual Notice / Response Deadline Clock
              </span>
              <DeadlineBadge
                deadlineDate={record.response_deadline}
                status={record.status}
                eventDate={record.event_date}
                noticePeriodDays={record.notice_period_days}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs bg-white p-2.5 rounded-lg border border-blue-100 font-mono">
              <div>
                <p className="text-slate-500 font-sans">Event Date:</p>
                <p className="font-semibold text-slate-900">{record.event_date ? formatDate(record.event_date) : '—'}</p>
              </div>
              <div>
                <p className="text-slate-500 font-sans">Notice Period:</p>
                <p className="font-semibold text-slate-900">{record.notice_period_days ? `${record.notice_period_days} Days` : '—'}</p>
              </div>
              <div>
                <p className="text-slate-500 font-sans">Deadline Date:</p>
                <p className="font-bold text-blue-700">{record.response_deadline ? formatDate(record.response_deadline) : '—'}</p>
              </div>
            </div>

            {record.clause_reference && (
              <p className="text-[11px] text-slate-600 font-mono">
                Clause Rule: <b>{record.clause_reference}</b>
              </p>
            )}

            {record.event_date && record.notice_period_days && record.response_deadline && (
              <div className="text-[11px] text-slate-500 font-mono bg-slate-50 p-2 rounded border border-slate-200">
                Formula: Event Date ({record.event_date}) + {record.notice_period_days} Days Notice Period = Calculated Deadline ({record.response_deadline})
              </div>
            )}
          </div>
        )}

        {/* Relational Business Links */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
          <p className="font-bold text-slate-900 text-xs">Linked Business Records</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {record.related_contract_event_id && (
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Contract Event:</span>
                <p className="font-bold text-slate-900">{record.contract_events?.event_number || 'Linked Event'}</p>
              </div>
            )}
            {record.related_hindrance_id && (
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Hindrance:</span>
                <p className="font-bold text-slate-900">Hindrance #{record.hindrances?.hindrance_number || 'Linked'}</p>
              </div>
            )}
            {record.related_boq_item_id && (
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold">BOQ Item:</span>
                <p className="font-bold text-slate-900">Item {record.related_boq_item_id}</p>
              </div>
            )}
            {record.related_eot_id && (
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold">EOT Claim:</span>
                <p className="font-bold text-slate-900">Form 27 Claim</p>
              </div>
            )}
          </div>
          {!record.related_contract_event_id && !record.related_hindrance_id && !record.related_boq_item_id && !record.related_eot_id && (
            <p className="text-[11px] text-slate-400 italic">No specific sub-module linked. General contract correspondence.</p>
          )}
        </div>

        {/* Dispatch Details */}
        <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div>
            <p className="text-slate-500">Mode of Dispatch</p>
            <p className="font-semibold text-slate-900">{record.mode_of_dispatch || 'Speed Post with A/D'}</p>
          </div>
          <div>
            <p className="text-slate-500">Consignment / Tracking Number</p>
            <p className="font-mono font-semibold text-slate-900">{record.tracking_consignment_number || '—'}</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          {record.response_required && record.status !== 'RESPONDED' && record.status !== 'CLOSED' && (
            <Button
              size="sm"
              disabled={updating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              onClick={handleMarkResponded}
            >
              {updating ? 'Updating…' : '✓ Mark as Responded'}
            </Button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <Button
              size="sm"
              variant="secondary"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
