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
import { RelatedRecordsPanel, RelatedRecordItem } from '@/components/common/RelatedRecordsPanel'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { SendWhatsAppModal } from '@/components/alerts/SendWhatsAppModal'

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
  const [whatsAppOpen, setWhatsAppOpen] = useState(false)

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

        {/* UNIFIED RELATED RECORDS PANEL */}
        <RelatedRecordsPanel
          title="Connected Contractual Records"
          description="Contemporaneous link to site events, hindrances, billing and claims."
          records={[
            {
              id: record.project_id,
              type: 'project' as const,
              title: 'Project Master Record',
              href: `/projects/${record.project_id}`,
            },
            ...(record.contract_id ? [{
              id: record.contract_id,
              type: 'contract' as const,
              title: 'Contract Agreement',
              href: `/projects/${record.project_id}/contract`,
            }] : []),
            ...(record.related_contract_event_id ? [{
              id: record.related_contract_event_id,
              type: 'event' as const,
              title: record.contract_events?.event_number ? `Contract Event: ${record.contract_events.event_number}` : 'Linked Contract Event',
              subtitle: record.contract_events?.description || undefined,
              referenceNumber: record.contract_events?.event_number,
              href: `/hindrances?tab=events&projectId=${record.project_id}`,
            }] : []),
            ...(record.related_hindrance_id ? [{
              id: record.related_hindrance_id,
              type: 'hindrance' as const,
              title: `Hindrance #${record.hindrances?.hindrance_number || 'Linked'}`,
              subtitle: record.hindrances?.description || undefined,
              href: `/hindrances?tab=hindrances&projectId=${record.project_id}`,
            }] : []),
            ...(record.related_boq_item_id ? [{
              id: record.related_boq_item_id,
              type: 'boq' as const,
              title: `BOQ Item #${record.related_boq_item_id.slice(0, 8)}`,
              href: `/projects/${record.project_id}/boq/${record.related_boq_item_id}`,
            }] : []),
            ...(record.related_eot_id ? [{
              id: record.related_eot_id,
              type: 'eot' as const,
              title: 'Extension of Time Case',
              status: 'EOT',
              href: `/eot?projectId=${record.project_id}`,
            }] : []),
            ...(record.related_claim_id ? [{
              id: record.related_claim_id,
              type: 'claim' as const,
              title: 'Linked Contract Claim',
              status: 'CLAIM',
              href: `/claims?projectId=${record.project_id}`,
            }] : []),
            ...(record.attachment_url ? [{
              id: `att-${record.id}`,
              type: 'evidence' as const,
              title: 'Dispatched Communication Attachment',
              href: record.attachment_url,
            }] : []),
          ]}
        />

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
          <div className="flex items-center gap-2">
            {record.response_required && record.response_deadline && (
              <Button
                size="sm"
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs inline-flex items-center gap-1.5"
                onClick={() => setWhatsAppOpen(true)}
              >
                <span>💬</span>
                <span>Push WhatsApp Alert</span>
              </Button>
            )}

            {record.response_required && record.status !== 'RESPONDED' && record.status !== 'CLOSED' && (
              <Button
                size="sm"
                disabled={updating}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                onClick={handleMarkResponded}
              >
                {updating ? 'Updating…' : '✓ Mark as Responded'}
              </Button>
            )}
          </div>

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

      {whatsAppOpen && (
        <SendWhatsAppModal
          isOpen={whatsAppOpen}
          onClose={() => setWhatsAppOpen(false)}
          alertType="clause_notice"
          title={`Notice Deadline Alert: ${record.letter_number || record.reference_number}`}
          data={{
            reference: record.letter_number || record.reference_number,
            subject: record.subject,
            date: record.response_deadline || undefined,
            daysRemaining: record.response_deadline
              ? Math.ceil((new Date(record.response_deadline).getTime() - Date.now()) / 86400000)
              : undefined,
            entityId: record.id,
            projectId: record.project_id,
          }}
        />
      )}
    </Modal>
  )
}
