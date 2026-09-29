/**
 * Centralized Immutable Audit Trail System for PillarPro Enterprise.
 * Records all high-stakes contractor engineering, contractual, and financial changes.
 */

import { SupabaseClient } from '@supabase/supabase-js'

export type AuditActionType =
  | 'MEASUREMENT_CERTIFIED'
  | 'MEASUREMENT_CORRECTED'
  | 'BOQ_QUANTITY_CHANGED'
  | 'VARIATION_APPROVED'
  | 'RA_BILL_SUBMITTED'
  | 'PAYMENT_RECORDED'
  | 'CLAIM_SUBMITTED'
  | 'CONTRACT_DATE_CHANGED'
  | 'EOT_SUBMITTED'
  | 'EOT_APPROVED'
  | 'RECORD_CREATED'
  | 'RECORD_UPDATED'
  | 'RECORD_DELETED'

export interface AuditLogEntry {
  id: string
  organization_id: string
  project_id?: string | null
  user_id?: string | null
  user_email?: string | null
  user_name?: string | null
  user_role?: string | null
  action: AuditActionType | string
  entity_type: string
  entity_id: string
  entity_identifier?: string | null
  previous_values: Record<string, any>
  new_values: Record<string, any>
  diff_summary: Record<string, any>
  notes?: string | null
  ip_address?: string | null
  user_agent?: string | null
  created_at: string
}

export interface LogAuditParams {
  organizationId: string
  projectId?: string | null
  userId?: string | null
  userEmail?: string | null
  userName?: string | null
  userRole?: string | null
  action: AuditActionType | string
  entityType: string
  entityId: string
  entityIdentifier?: string | null
  previousValues?: Record<string, any>
  newValues?: Record<string, any>
  diffSummary?: Record<string, any>
  notes?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}

/**
 * Computes human-readable key-level differences between previous and new values.
 */
export function computeFieldDiff(
  prev: Record<string, any> = {},
  next: Record<string, any> = {}
): Record<string, { from: any; to: any }> {
  const diff: Record<string, { from: any; to: any }> = {}
  const allKeys = Array.from(new Set([...Object.keys(prev), ...Object.keys(next)]))

  for (const key of allKeys) {
    // Ignore internal timestamp fields
    if (['updated_at', 'created_at', 'id'].includes(key)) continue

    const oldVal = prev[key]
    const newVal = next[key]

    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diff[key] = { from: oldVal ?? null, to: newVal ?? null }
    }
  }

  return diff
}

/**
 * Inserts an immutable audit log row into public.audit_logs.
 */
export async function logAuditEvent(
  supabase: SupabaseClient,
  params: LogAuditParams
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const diff = params.diffSummary ?? computeFieldDiff(params.previousValues, params.newValues)

    const payload = {
      organization_id: params.organizationId,
      project_id: params.projectId ?? null,
      user_id: params.userId ?? null,
      user_email: params.userEmail ?? null,
      user_name: params.userName ?? null,
      user_role: params.userRole ?? null,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      entity_identifier: params.entityIdentifier ?? null,
      previous_values: params.previousValues ?? {},
      new_values: params.newValues ?? {},
      diff_summary: diff,
      notes: params.notes ?? null,
      ip_address: params.ipAddress ?? null,
      user_agent: params.userAgent ?? null,
    }

    const { data, error } = await supabase
      .from('audit_logs')
      .insert(payload)
      .select('id')
      .single()

    if (error) {
      console.error('[AUDIT LOG ERROR]', error.message, payload)
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id }
  } catch (err: any) {
    console.error('[AUDIT LOG EXCEPTION]', err)
    return { success: false, error: err?.message || 'Unknown error' }
  }
}

/**
 * Action badge formatting utility.
 */
export function formatAuditAction(action: string): { label: string; color: string; badgeVariant: 'default' | 'success' | 'warning' | 'danger' | 'info' } {
  switch (action) {
    case 'MEASUREMENT_CERTIFIED':
      return { label: 'Measurement Certified', color: 'emerald', badgeVariant: 'success' }
    case 'MEASUREMENT_CORRECTED':
      return { label: 'Measurement Corrected', color: 'amber', badgeVariant: 'warning' }
    case 'BOQ_QUANTITY_CHANGED':
      return { label: 'BOQ Quantity Changed', color: 'blue', badgeVariant: 'info' }
    case 'VARIATION_APPROVED':
      return { label: 'Variation Approved', color: 'purple', badgeVariant: 'success' }
    case 'RA_BILL_SUBMITTED':
      return { label: 'RA Bill Submitted', color: 'emerald', badgeVariant: 'success' }
    case 'PAYMENT_RECORDED':
      return { label: 'Payment Recorded', color: 'indigo', badgeVariant: 'success' }
    case 'CLAIM_SUBMITTED':
      return { label: 'Claim Submitted', color: 'rose', badgeVariant: 'danger' }
    case 'CONTRACT_DATE_CHANGED':
      return { label: 'Contract Date/Value Changed', color: 'orange', badgeVariant: 'warning' }
    case 'EOT_SUBMITTED':
      return { label: 'EOT Submitted', color: 'blue', badgeVariant: 'info' }
    case 'EOT_APPROVED':
      return { label: 'EOT Approved', color: 'emerald', badgeVariant: 'success' }
    default:
      return {
        label: action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        color: 'slate',
        badgeVariant: 'default',
      }
  }
}
