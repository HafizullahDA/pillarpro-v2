/**
 * Autonomous Alerts Dispatch Engine
 * Coordinates domain scanners, performs deduplication checks against the ledger,
 * formats enterprise WhatsApp messages, and dispatches via Meta Cloud API.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { AlertCandidate, ScanRunSummary, AlertDispatchStatus } from './types'
import { scanSecurities } from './scanners/securitiesScanner'
import { scanNotices } from './scanners/noticesScanner'
import { isMilestoneDispatched, recordDispatchLog } from './ledger'
import {
  generateEnterpriseExecutiveAlertText,
  generateClauseNoticeWhatsAppText,
} from '../whatsappTemplates'
import { sendWhatsAppTextMessage } from '../whatsappCloudApi'

export interface DispatchEngineOptions {
  dryRun?: boolean
  asOfDateStr?: string
  overrideRecipientPhone?: string
}

export async function runDailyMorningScan(
  supabase: SupabaseClient,
  options: DispatchEngineOptions = {}
): Promise<ScanRunSummary> {
  const runId = `scan-${Date.now()}`
  const timestamp = new Date().toISOString()
  const defaultPhone =
    options.overrideRecipientPhone ||
    process.env.WHATSAPP_ALERT_RECIPIENT_PHONE ||
    ''

  const summary: ScanRunSummary = {
    runId,
    timestamp,
    totalScanned: 0,
    eligibleCandidates: 0,
    dispatchedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    details: [],
  }

  // 1. Gather all candidates from active domain scanners
  const [securitiesCandidates, noticesCandidates] = await Promise.all([
    scanSecurities(supabase, options.asOfDateStr),
    scanNotices(supabase, options.asOfDateStr),
  ])

  const allCandidates: AlertCandidate[] = [
    ...securitiesCandidates,
    ...noticesCandidates,
  ]

  summary.totalScanned = allCandidates.length
  summary.eligibleCandidates = allCandidates.length

  // 2. Process each candidate with deduplication & dispatch
  for (const candidate of allCandidates) {
    const targetPhone = candidate.recipientPhone || defaultPhone

    // If no phone number is configured, record failure and continue
    if (!targetPhone) {
      summary.failedCount++
      summary.details.push({
        entityType: candidate.entityType,
        entityId: candidate.entityId,
        entityReference: candidate.entityReference,
        milestoneKey: candidate.milestoneKey,
        status: 'failed',
        recipientPhone: '',
        error: 'No recipient phone number configured for alert.',
      })
      continue
    }

    // 3. Deduplication check: Has this milestone already been dispatched?
    const alreadyDispatched = await isMilestoneDispatched(
      supabase,
      candidate.entityType,
      candidate.entityId,
      candidate.milestoneKey
    )

    if (alreadyDispatched) {
      summary.skippedCount++
      summary.details.push({
        entityType: candidate.entityType,
        entityId: candidate.entityId,
        entityReference: candidate.entityReference,
        milestoneKey: candidate.milestoneKey,
        status: 'skipped',
        recipientPhone: targetPhone,
      })
      continue
    }

    // 4. Format enterprise message text
    let messageText = ''
    if (candidate.entityType === 'bank_guarantee') {
      messageText = generateEnterpriseExecutiveAlertText({
        reference: candidate.entityReference,
        date: candidate.targetDate,
        daysRemaining: candidate.daysRemaining,
        amount: candidate.metaAmount,
        issuingBank: candidate.issuingBank,
        depositType: candidate.depositType,
        projectName: candidate.projectName,
        entityId: candidate.entityId,
      })
    } else if (candidate.entityType === 'correspondence') {
      messageText = generateClauseNoticeWhatsAppText({
        reference: candidate.letterNumber || candidate.entityReference,
        subject: candidate.subject,
        clauseTitle: candidate.clauseCitation,
        date: candidate.targetDate,
        daysRemaining: candidate.daysRemaining,
        projectName: candidate.projectName,
        entityId: candidate.entityId,
      })
    } else {
      messageText = `⚠️ CONTRACTUAL ALERT: ${candidate.entityReference} is ${candidate.urgencyLabel}. Target date: ${candidate.targetDate}.`
    }

    // 5. Dry-run support: Skip real API call and DB insert
    if (options.dryRun) {
      summary.dispatchedCount++
      summary.details.push({
        entityType: candidate.entityType,
        entityId: candidate.entityId,
        entityReference: candidate.entityReference,
        milestoneKey: candidate.milestoneKey,
        status: 'dispatched',
        recipientPhone: targetPhone,
        metaMessageId: 'dry-run-simulated-id',
      })
      continue
    }

    // 6. Execute live Meta Cloud API WhatsApp dispatch
    try {
      const dispatchResult = await sendWhatsAppTextMessage({
        to: targetPhone,
        text: messageText,
      })

      const status: AlertDispatchStatus = dispatchResult.success ? 'dispatched' : 'failed'

      if (dispatchResult.success) {
        summary.dispatchedCount++
      } else {
        summary.failedCount++
      }

      summary.details.push({
        entityType: candidate.entityType,
        entityId: candidate.entityId,
        entityReference: candidate.entityReference,
        milestoneKey: candidate.milestoneKey,
        status,
        recipientPhone: targetPhone,
        metaMessageId: dispatchResult.messageId,
        error: dispatchResult.error,
      })

      // 7. Record into deduplication ledger
      await recordDispatchLog(supabase, {
        organization_id: candidate.organizationId,
        project_id: candidate.projectId,
        entity_type: candidate.entityType,
        entity_id: candidate.entityId,
        entity_reference: candidate.entityReference,
        milestone_key: candidate.milestoneKey,
        channel: 'whatsapp',
        recipient_phone: targetPhone,
        status,
        error_message: dispatchResult.error || null,
        meta_message_id: dispatchResult.messageId || null,
        payload_snapshot: {
          daysRemaining: candidate.daysRemaining,
          urgencyLabel: candidate.urgencyLabel,
          targetDate: candidate.targetDate,
        },
      })
    } catch (err: any) {
      summary.failedCount++
      summary.details.push({
        entityType: candidate.entityType,
        entityId: candidate.entityId,
        entityReference: candidate.entityReference,
        milestoneKey: candidate.milestoneKey,
        status: 'failed',
        recipientPhone: targetPhone,
        error: err.message || 'Dispatch exception',
      })
    }
  }

  return summary
}
