'use client'

import React from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { RecordActivityTimeline } from './RecordActivityTimeline'

interface RecordActivityModalProps {
  open: boolean
  onClose: () => void
  entityType: string
  entityId: string
  title?: string
  subtitle?: string
}

export function RecordActivityModal({
  open,
  onClose,
  entityType,
  entityId,
  title,
  subtitle,
}: RecordActivityModalProps) {
  if (!open) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || 'Immutable Activity & Audit History'}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        <RecordActivityTimeline
          entityType={entityType}
          entityId={entityId}
          title={title}
          subtitle={subtitle}
        />

        <div className="flex items-center justify-between pt-3 border-t border-slate-200 mt-4">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
            </svg>
            <span>Certified immutable record under Section 65B Indian Evidence Act compliant logging.</span>
          </div>
          <Button size="sm" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
