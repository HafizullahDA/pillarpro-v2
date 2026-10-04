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
  | 'RA_BILL_CREATED'
  | 'RA_BILL_STATUS_CHANGED'
  | 'RA_BILL_UPDATED'
  | 'RA_BILL_CANCELLED'
  | 'PAYMENT_RECORDED'
  | 'CLAIM_SUBMITTED'
  | 'CONTRACT_DATE_CHANGED'
  | 'EOT_SUBMITTED'
  | 'EOT_APPROVED'
  | 'SECURITY_DEPOSIT_CREATED'
  | 'SECURITY_DEPOSIT_UPDATED'
  | 'SECURITY_DEPOSIT_STATUS_CHANGED'
  | 'SECURITY_DEPOSIT_RELEASED'
  | 'SECURITY_DEPOSIT_INVOKED'
  | 'SECURITY_DEPOSIT_EXPIRED'
  | 'SECURITY_DEPOSIT_DELETED'
  | 'SUPPLIER_TRANSACTION_CREATED'
  | 'SUPPLIER_TRANSACTION_UPDATED'
  | 'SUPPLIER_TRANSACTION_DELETED'
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
export function formatAuditAction(action: string): { label: string; color: string; badgeVariant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' } {
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
    case 'RA_BILL_CREATED':
      return { label: 'RA Bill Created', color: 'emerald', badgeVariant: 'success' }
    case 'RA_BILL_STATUS_CHANGED':
      return { label: 'RA Bill Status Changed', color: 'blue', badgeVariant: 'info' }
    case 'RA_BILL_UPDATED':
      return { label: 'RA Bill Amended', color: 'amber', badgeVariant: 'warning' }
    case 'RA_BILL_CANCELLED':
      return { label: 'RA Bill Cancelled/Voided', color: 'rose', badgeVariant: 'danger' }
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
    case 'SECURITY_DEPOSIT_CREATED':
      return { label: 'Deposit / BG Pledged', color: 'emerald', badgeVariant: 'success' }
    case 'SECURITY_DEPOSIT_UPDATED':
      return { label: 'Deposit / BG Amended', color: 'amber', badgeVariant: 'warning' }
    case 'SECURITY_DEPOSIT_STATUS_CHANGED':
      return { label: 'Deposit Status Changed', color: 'blue', badgeVariant: 'info' }
    case 'SECURITY_DEPOSIT_RELEASED':
      return { label: 'Deposit / BG Released', color: 'emerald', badgeVariant: 'success' }
    case 'SECURITY_DEPOSIT_INVOKED':
      return { label: 'Deposit / BG Invoked', color: 'rose', badgeVariant: 'danger' }
    case 'SECURITY_DEPOSIT_EXPIRED':
      return { label: 'Deposit / BG Expired', color: 'slate', badgeVariant: 'neutral' }
    case 'SECURITY_DEPOSIT_DELETED':
      return { label: 'Deposit Record Deleted', color: 'rose', badgeVariant: 'danger' }
    case 'SUPPLIER_TRANSACTION_CREATED':
      return { label: 'Ledger Entry Recorded', color: 'emerald', badgeVariant: 'success' }
    case 'SUPPLIER_TRANSACTION_UPDATED':
      return { label: 'Ledger Entry Corrected', color: 'amber', badgeVariant: 'warning' }
    case 'SUPPLIER_TRANSACTION_DELETED':
      return { label: 'Ledger Entry Deleted', color: 'rose', badgeVariant: 'danger' }
    default:
      return {
        label: action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        color: 'slate',
        badgeVariant: 'default',
      }
  }
}

/**
 * Fetches the chronological audit history for a specific record.
 */
export async function fetchEntityAuditLogs(
  supabase: SupabaseClient,
  entityType: string,
  entityId: string
): Promise<AuditLogEntry[]> {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(`[AUDIT TRAIL FETCH ERROR ${entityType}:${entityId}]`, error.message)
      return []
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      organization_id: row.organization_id,
      project_id: row.project_id,
      user_id: row.user_id,
      user_email: row.user_email,
      user_name: row.user_name,
      user_role: row.user_role,
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      entity_identifier: row.entity_identifier,
      previous_values: row.previous_values ?? {},
      new_values: row.new_values ?? {},
      diff_summary: row.diff_summary ?? {},
      notes: row.notes,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      created_at: row.created_at,
    }))
  } catch (err) {
    console.error(`[AUDIT TRAIL EXCEPTION ${entityType}:${entityId}]`, err)
    return []
  }
}
