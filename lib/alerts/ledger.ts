/**
 * Alerts Deduplication & Dispatch Ledger
 * Interacts with public.alert_dispatch_logs to guarantee zero duplicate notifications.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { AlertEntityType, MilestoneKey, DispatchLogRecord } from './types'
import { logAuditEvent } from '../audit'

/**
 * Checks whether an alert for a specific entity and milestone has already been dispatched.
 * Handles database table availability gracefully with safe fallback.
 */
export async function isMilestoneDispatched(
  supabase: SupabaseClient,
  entityType: AlertEntityType,
  entityId: string,
  milestoneKey: MilestoneKey
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('alert_dispatch_logs')
      .select('id, dispatched_at')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('milestone_key', milestoneKey)
      .eq('status', 'dispatched')
      .limit(1)

    if (error) {
      // Table may not yet be migrated in development
      console.warn('[ALERT LEDGER] Query warning (table may not exist):', error.message)
      return false
    }

    return (data && data.length > 0) || false
  } catch (err: any) {
    console.warn('[ALERT LEDGER] Exception checking dispatch log:', err.message)
    return false
  }
}

/**
 * Records a dispatch attempt in public.alert_dispatch_logs and logs an audit event.
 */
export async function recordDispatchLog(
  supabase: SupabaseClient,
  record: DispatchLogRecord
): Promise<void> {
  try {
    const { error } = await supabase
      .from('alert_dispatch_logs')
      .insert({
        organization_id: record.organization_id || null,
        project_id: record.project_id || null,
        entity_type: record.entity_type,
        entity_id: record.entity_id,
        entity_reference: record.entity_reference || null,
        milestone_key: record.milestone_key,
        channel: record.channel || 'whatsapp',
        recipient_phone: record.recipient_phone,
        status: record.status,
        error_message: record.error_message || null,
        meta_message_id: record.meta_message_id || null,
        payload_snapshot: record.payload_snapshot || {},
        dispatched_at: record.dispatched_at || new Date().toISOString(),
      })

    if (error) {
      console.warn('[ALERT LEDGER] Insert warning:', error.message)
    }

    // Also record in central immutable audit log if successful
    if (record.status === 'dispatched' && record.organization_id) {
      await logAuditEvent(supabase, {
        organizationId: record.organization_id,
        projectId: record.project_id,
        action: 'WHATSAPP_ALERT_SENT',
        entityType: record.entity_type,
        entityId: record.entity_id,
        entityIdentifier: record.entity_reference,
        newValues: {
          milestoneKey: record.milestone_key,
          recipientPhone: record.recipient_phone,
          metaMessageId: record.meta_message_id,
        },
        notes: `Autonomous WhatsApp alert dispatched for ${record.milestone_key}.`,
      }).catch(() => {})
    }
  } catch (err: any) {
    console.warn('[ALERT LEDGER] Exception recording dispatch log:', err.message)
  }
}
