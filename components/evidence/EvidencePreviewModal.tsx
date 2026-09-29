'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EvidenceRecord, EVIDENCE_TYPE_CONFIG } from '@/lib/types/evidence'
import { formatDate } from '@/lib/format'
import { RelatedRecordsPanel, RelatedRecordItem } from '@/components/common/RelatedRecordsPanel'

interface EvidencePreviewModalProps {
  open: boolean
  onClose: () => void
  evidence: EvidenceRecord | null
  onUploadNewVersion?: (record: EvidenceRecord) => void
}

export function EvidencePreviewModal({
  open,
  onClose,
  evidence,
  onUploadNewVersion,
}: EvidencePreviewModalProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'related' | 'versions' | 'metadata'>('preview')

  if (!evidence) return null

  const typeConfig = EVIDENCE_TYPE_CONFIG[evidence.type] || EVIDENCE_TYPE_CONFIG.OTHER
  const isImage =
    evidence.type === 'PHOTO' ||
    evidence.file_type?.startsWith('image/') ||
    evidence.file_url.match(/\.(jpeg|jpg|png|webp|gif|svg)$/i)
  const isPdf =
    evidence.type === 'PDF' ||
    evidence.file_type === 'application/pdf' ||
    evidence.file_url.match(/\.pdf$/i)
  const isVideo =
    evidence.type === 'VIDEO' ||
    evidence.file_type?.startsWith('video/') ||
    evidence.file_url.match(/\.(mp4|webm|mov)$/i)

  const fileSizeKB = evidence.file_size_bytes ? (evidence.file_size_bytes / 1024).toFixed(1) : '—'
  const fileSizeMB = evidence.file_size_bytes && evidence.file_size_bytes > 1024 * 1024
    ? `(${(evidence.file_size_bytes / (1024 * 1024)).toFixed(2)} MB)`
    : ''

  const hasPhotoMetadata =
    evidence.metadata &&
    (evidence.metadata.cameraMake ||
      evidence.metadata.cameraModel ||
      evidence.metadata.dateTimeOriginal ||
      (evidence.metadata.latitude !== undefined && evidence.metadata.longitude !== undefined))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Evidence Record: ${evidence.evidence_number}`}
    >
      <div className="space-y-4 text-left text-xs text-slate-700">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-slate-900 font-mono">{evidence.evidence_number}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${typeConfig.badgeColor}`}>
                {typeConfig.icon} {typeConfig.label}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                v{evidence.version_number || 1}
              </span>
            </div>
            <h3 className="font-semibold text-slate-900 text-sm mt-1">{evidence.title}</h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onUploadNewVersion && (
              <Button
                size="sm"
                variant="secondary"
                className="text-xs"
                onClick={() => onUploadNewVersion(evidence)}
              >
                + New Version
              </Button>
            )}
            <a
              href={evidence.file_url}
              target="_blank"
              rel="noopener noreferrer"
              download={evidence.original_filename || 'evidence_document'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs transition-colors"
            >
              <span>Download</span>
              <span>&darr;</span>
            </a>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('preview')}
            className={`pb-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'preview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            File Preview
          </button>
          <button
            onClick={() => setActiveTab('related')}
            className={`pb-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'related'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Linked Records</span>
          </button>
          <button
            onClick={() => setActiveTab('versions')}
            className={`pb-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'versions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Version History</span>
            <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-full font-mono">
              {1 + (evidence.versions?.length || 0)}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('metadata')}
            className={`pb-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'metadata'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Technical Metadata
          </button>
        </div>

        {/* TAB 1: FILE PREVIEW */}
        {activeTab === 'preview' && (
          <div className="space-y-3">
            <div className="bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center min-h-[300px] max-h-[500px] border border-slate-200">
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={evidence.file_url}
                  alt={evidence.title}
                  className="max-h-[480px] w-auto max-w-full object-contain mx-auto rounded-lg shadow-sm"
                />
              ) : isPdf ? (
                <iframe
                  src={evidence.file_url}
                  title={evidence.title}
                  className="w-full h-[450px] border-0"
                />
              ) : isVideo ? (
                <video
                  src={evidence.file_url}
                  controls
                  className="w-full max-h-[450px]"
                />
              ) : (
                <div className="text-center p-8 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-2xl flex items-center justify-center mx-auto shadow-xs">
                    {typeConfig.icon}
                  </div>
                  <p className="font-bold text-slate-900">{evidence.original_filename || evidence.title}</p>
                  <p className="text-[11px] text-slate-500">
                    {evidence.file_type || 'Binary Document'} &bull; {fileSizeKB} KB {fileSizeMB}
                  </p>
                  <a
                    href={evidence.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700"
                  >
                    Open in External Viewer &rarr;
                  </a>
                </div>
              )}
            </div>

            {evidence.description && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider mb-1">Description / Content Summary</p>
                <p className="text-slate-800 leading-relaxed">{evidence.description}</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LINKED BUSINESS RECORDS */}
        {activeTab === 'related' && (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-blue-950">
              <p className="font-bold">Contemporaneous Relational Linking</p>
              <p className="text-[11px] text-blue-800/90 mt-0.5 leading-relaxed">
                This evidence item directly substantiates and proves the following project milestones, contractual claims, and site records.
              </p>
            </div>

            <RelatedRecordsPanel
              title="Substantiated Business Records"
              description="Traceable links to measurements, hindrances, variations, and claims."
              records={[
                {
                  id: evidence.project_id,
                  type: 'project' as const,
                  title: 'Project Master Record',
                  href: `/projects/${evidence.project_id}`,
                },
                ...(evidence.contract_id ? [{
                  id: evidence.contract_id,
                  type: 'contract' as const,
                  title: 'Contract Agreement',
                  href: `/projects/${evidence.project_id}/contract`,
                }] : []),
                ...(evidence.related_contract_event_id ? [{
                  id: evidence.related_contract_event_id,
                  type: 'event' as const,
                  title: evidence.contract_events?.event_number ? `Contract Event: ${evidence.contract_events.event_number}` : 'Linked Delay Event',
                  subtitle: evidence.contract_events?.description || undefined,
                  referenceNumber: evidence.contract_events?.event_number,
                  href: `/hindrances?tab=events&projectId=${evidence.project_id}`,
                }] : []),
                ...(evidence.related_hindrance_id ? [{
                  id: evidence.related_hindrance_id,
                  type: 'hindrance' as const,
                  title: `Hindrance #${evidence.hindrances?.hindrance_number || 'Linked'}`,
                  subtitle: evidence.hindrances?.description || undefined,
                  href: `/hindrances?tab=hindrances&projectId=${evidence.project_id}`,
                }] : []),
                ...(evidence.related_measurement_id ? [{
                  id: evidence.related_measurement_id,
                  type: 'measurement' as const,
                  title: `e-MB Entry #${evidence.measurement_entries?.entry_number || 'Linked'}`,
                  subtitle: evidence.measurement_entries?.calculated_quantity ? `Quantity: ${evidence.measurement_entries.calculated_quantity}` : undefined,
                  status: 'e-MB',
                  href: `/measurement?projectId=${evidence.project_id}`,
                }] : []),
                ...(evidence.related_boq_item_id ? [{
                  id: evidence.related_boq_item_id,
                  type: 'boq' as const,
                  title: evidence.boq_items?.item_number ? `BOQ Item ${evidence.boq_items.item_number}` : 'Linked BOQ Item',
                  subtitle: evidence.boq_items?.description || undefined,
                  referenceNumber: evidence.boq_items?.item_number,
                  href: `/projects/${evidence.project_id}/boq/${evidence.related_boq_item_id}`,
                }] : []),
                ...(evidence.related_ra_bill_id ? [{
                  id: evidence.related_ra_bill_id,
                  type: 'ra_bill' as const,
                  title: 'Linked Running Account Bill',
                  status: 'RA BILL',
                  href: `/ledgers/ra-bills?projectId=${evidence.project_id}`,
                }] : []),
                ...(evidence.related_eot_id ? [{
                  id: evidence.related_eot_id,
                  type: 'eot' as const,
                  title: 'Extension of Time Case',
                  status: 'EOT',
                  href: `/eot?projectId=${evidence.project_id}`,
                }] : []),
                ...(evidence.related_claim_id ? [{
                  id: evidence.related_claim_id,
                  type: 'claim' as const,
                  title: 'Contractual Claim',
                  status: 'CLAIM',
                  href: `/claims?projectId=${evidence.project_id}`,
                }] : []),
              ]}
            />
          </div>
        )}

        {activeTab === 'versions' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                All uploaded revisions are preserved with audit trails. Previous versions remain accessible.
              </p>
              {onUploadNewVersion && (
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                  onClick={() => onUploadNewVersion(evidence)}
                >
                  + Upload New Version
                </Button>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
              {/* Current Version */}
              <div className="p-3.5 bg-blue-50/40 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-blue-600 text-white shrink-0">
                    v{evidence.version_number || 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">Current Active Version</span>
                      <Badge label="Active" variant="success" />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      File: {evidence.original_filename || 'document'} &bull; {fileSizeKB} KB {fileSizeMB}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Last Updated: {formatDate(evidence.updated_at || evidence.created_at)}
                    </p>
                  </div>
                </div>
                <a
                  href={evidence.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs"
                >
                  View File &rarr;
                </a>
              </div>

              {/* Archived Past Versions */}
              {evidence.versions && evidence.versions.length > 0 ? (
                evidence.versions.map(v => (
                  <div key={v.id} className="p-3.5 flex items-start justify-between gap-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-700 shrink-0">
                        v{v.version_number}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">Archived Version v{v.version_number}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatDate(v.uploaded_at)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5 italic">
                          &ldquo;{v.change_summary}&rdquo;
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                          {v.original_filename || 'document'} &bull; {v.file_size_bytes ? (v.file_size_bytes / 1024).toFixed(1) : 0} KB
                        </p>
                      </div>
                    </div>
                    <a
                      href={v.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs"
                    >
                      View v{v.version_number} &rarr;
                    </a>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-slate-400 text-xs italic">
                  No prior versions on file. This document is at its initial revision (v1).
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: TECHNICAL METADATA */}
        {activeTab === 'metadata' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <p className="text-slate-500">Document / Event Date</p>
                <p className="font-semibold text-slate-900">{formatDate(evidence.document_date)}</p>
              </div>
              <div>
                <p className="text-slate-500">Uploaded On</p>
                <p className="font-semibold text-slate-900">{formatDate(evidence.created_at)}</p>
              </div>
              <div>
                <p className="text-slate-500">Source of Record</p>
                <p className="font-semibold text-slate-900">{evidence.source || 'Contractor'}</p>
              </div>
              <div>
                <p className="text-slate-500">MIME / File Type</p>
                <p className="font-mono text-slate-900">{evidence.file_type || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-slate-500">Original File Name</p>
                <p className="font-mono text-slate-900 truncate" title={evidence.original_filename || ''}>
                  {evidence.original_filename || 'document'}
                </p>
              </div>
              <div>
                <p className="text-slate-500">File Size</p>
                <p className="font-mono text-slate-900">{fileSizeKB} KB {fileSizeMB}</p>
              </div>
            </div>

            {/* Photograph Metadata (EXIF / GPS) */}
            {hasPhotoMetadata && (
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                <p className="font-bold text-slate-900 text-xs">Photograph Hardware &amp; Geolocation Proof</p>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  {evidence.metadata?.cameraMake && (
                    <div><span className="text-slate-500 font-sans">Camera Make:</span> {evidence.metadata.cameraMake}</div>
                  )}
                  {evidence.metadata?.cameraModel && (
                    <div><span className="text-slate-500 font-sans">Camera Model:</span> {evidence.metadata.cameraModel}</div>
                  )}
                  {evidence.metadata?.dateTimeOriginal && (
                    <div><span className="text-slate-500 font-sans">Original Timestamp:</span> {evidence.metadata.dateTimeOriginal}</div>
                  )}
                  {evidence.metadata?.latitude !== undefined && evidence.metadata?.longitude !== undefined && (
                    <div className="col-span-2 bg-slate-50 p-2 rounded border border-slate-200">
                      <span className="text-slate-500 font-sans">GPS Coordinates:</span> {evidence.metadata.latitude.toFixed(6)}, {evidence.metadata.longitude.toFixed(6)}
                      {evidence.metadata.altitude !== undefined && (
                        <span className="text-slate-400 font-sans"> (Alt: {evidence.metadata.altitude}m)</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-slate-200">
          <Button
            size="sm"
            variant="secondary"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
