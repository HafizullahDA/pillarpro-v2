/**
 * Autonomous Alerts Dispatch Engine
 * Coordinates domain scanners across all phases:
 * - Phase 1: Securities (BG/FDR/CAR) & Notice Deadlines (CPWD 5.2 / FIDIC 20.1)
 * - Phase 2: Delayed RA Bills (CPWD 7 / MSMED 2006) & Supplier Credit Limits
 * - Phase 3: Site Operations (Evening DPR Missing, Low Stock Reorders, Fleet Maintenance/Compliance, Saturday Labour Payout)
 * Performs deduplication checks against the ledger, formats enterprise WhatsApp messages,
 * and dispatches via Meta Cloud API.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { AlertCandidate, ScanRunSummary, AlertDispatchStatus } from './types'
import { scanSecurities } from './scanners/securitiesScanner'
import { scanNotices } from './scanners/noticesScanner'
import { scanRABills } from './scanners/raBillsScanner'
import { scanSuppliers } from './scanners/suppliersScanner'
import { scanInventory } from './scanners/inventoryScanner'
import { scanMachinery } from './scanners/machineryScanner'
import { scanMissingDPRs } from './scanners/dprScanner'
import { scanWeeklyLabourPayout } from './scanners/labourPayoutScanner'
import { isMilestoneDispatched, recordDispatchLog } from './ledger'
import {
  generateEnterpriseExecutiveAlertText,
  generateClauseNoticeWhatsAppText,
  generateDelayedRABillWhatsAppText,
  generateSupplierCreditLimitWhatsAppText,
  generateMissingDPRWhatsAppText,
  generateInventoryReorderWhatsAppText,
  generateMachineryAlertWhatsAppText,
  generateLabourPayoutWhatsAppText,
} from '../whatsappTemplates'
import { sendWhatsAppTextMessage } from '../whatsappCloudApi'

export interface DispatchEngineOptions {
  dryRun?: boolean
  asOfDateStr?: string
  overrideRecipientPhone?: string
}

/**
 * Internal processor to deduplicate, format, and dispatch alert candidates.
 */
async function processCandidates(
  supabase: SupabaseClient,
  allCandidates: AlertCandidate[],
  options: DispatchEngineOptions,
  runPrefix: string = 'scan'
): Promise<ScanRunSummary> {
  const runId = `${runPrefix}-${Date.now()}`
  const timestamp = new Date().toISOString()
  const defaultPhone =
    options.overrideRecipientPhone ||
    process.env.WHATSAPP_ALERT_RECIPIENT_PHONE ||
    ''

  const summary: ScanRunSummary = {
    runId,
    timestamp,
    totalScanned: allCandidates.length,
    eligibleCandidates: allCandidates.length,
    dispatchedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    details: [],
  }

  // Load organization-level alert preferences for candidates
  const orgIds = Array.from(new Set(allCandidates.map(c => c.organizationId).filter(Boolean))) as string[]
  const orgPrefsMap: Record<string, any> = {}

  if (orgIds.length > 0) {
    try {
      const { data: prefs } = await supabase
        .from('alert_preferences')
        .select('*')
        .in('organization_id', orgIds)

      if (prefs) {
        for (const p of prefs) {
          orgPrefsMap[p.organization_id] = p
        }
      }
    } catch {
      // Graceful fallback if table is unavailable or offline
    }
  }

  for (const candidate of allCandidates) {
    const orgPrefs = candidate.organizationId ? orgPrefsMap[candidate.organizationId] : null

    // Check if domain is enabled in organization preferences
    if (orgPrefs) {
      const isEnabled =
        candidate.entityType === 'bank_guarantee' ? orgPrefs.bg_fdr_enabled !== false :
        candidate.entityType === 'correspondence' ? orgPrefs.contractual_notices_enabled !== false :
        candidate.entityType === 'ra_bill' ? orgPrefs.ra_bills_enabled !== false :
        candidate.entityType === 'supplier' ? orgPrefs.supplier_credit_enabled !== false :
        candidate.entityType === 'dpr' ? orgPrefs.dpr_reminders_enabled !== false :
        candidate.entityType === 'inventory' ? orgPrefs.inventory_reorder_enabled !== false :
        candidate.entityType === 'machinery' ? orgPrefs.machinery_fleet_enabled !== false :
        candidate.entityType === 'labour_payout' ? orgPrefs.labour_payout_enabled !== false : true

      if (!isEnabled) {
        summary.skippedCount++
        summary.details.push({
          entityType: candidate.entityType,
          entityId: candidate.entityId,
          entityReference: candidate.entityReference,
          milestoneKey: candidate.milestoneKey,
          status: 'skipped',
          recipientPhone: '',
          error: 'Alert domain paused in Alert Control Center',
        })
        continue
      }
    }

    // Role-specific phone routing from preferences
    let routedPhone = candidate.recipientPhone
    if (!routedPhone && orgPrefs) {
      if (candidate.entityType === 'ra_bill' || candidate.entityType === 'supplier') {
        routedPhone = orgPrefs.accounts_phone || orgPrefs.primary_phone
      } else if (
        candidate.entityType === 'dpr' ||
        candidate.entityType === 'inventory' ||
        candidate.entityType === 'machinery' ||
        candidate.entityType === 'labour_payout'
      ) {
        routedPhone = orgPrefs.site_phone || orgPrefs.primary_phone
      } else {
        routedPhone = orgPrefs.primary_phone
      }
    }
    const targetPhone = routedPhone || defaultPhone

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

    // Deduplication check: Has this milestone already been dispatched?
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

    // Format enterprise message text based on entity type
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
    } else if (candidate.entityType === 'ra_bill') {
      messageText = generateDelayedRABillWhatsAppText({
        reference: candidate.entityReference,
        billNumber: candidate.entityReference,
        date: candidate.targetDate,
        daysDelayed: Math.abs(candidate.daysRemaining),
        daysRemaining: candidate.daysRemaining,
        workCertifiedAmount: candidate.workCertifiedAmount,
        netPayableAmount: candidate.netPayableAmount,
        outstandingBalance: candidate.outstandingBalance,
        projectName: candidate.projectName,
        entityId: candidate.entityId,
      })
    } else if (candidate.entityType === 'supplier') {
      messageText = generateSupplierCreditLimitWhatsAppText({
        reference: candidate.entityReference,
        supplierName: candidate.entityReference,
        creditLimit: candidate.creditLimit,
        outstandingBalance: candidate.outstandingBalance,
        creditUtilizationPercent: candidate.creditUtilizationPercent,
        projectName: candidate.projectName,
        entityId: candidate.entityId,
      })
    } else if (candidate.entityType === 'dpr') {
      messageText = generateMissingDPRWhatsAppText({
        reference: candidate.entityReference,
        projectName: candidate.projectName,
        date: candidate.targetDate,
        entityId: candidate.entityId,
      })
    } else if (candidate.entityType === 'inventory') {
      messageText = generateInventoryReorderWhatsAppText({
        reference: candidate.entityReference,
        itemName: candidate.itemName,
        itemCode: candidate.itemCode,
        currentStock: candidate.currentStock,
        minimumStock: candidate.minimumStock,
        unit: candidate.unit,
        projectName: candidate.projectName,
        entityId: candidate.entityId,
      })
    } else if (candidate.entityType === 'machinery') {
      messageText = generateMachineryAlertWhatsAppText({
        reference: candidate.entityReference,
        assetName: candidate.assetName,
        registrationNumber: candidate.registrationNumber,
        projectName: candidate.projectName,
        currentMeter: candidate.currentMeter,
        targetDate: candidate.targetDate,
        daysRemaining: candidate.daysRemaining,
        hoursSinceLastService: candidate.hoursSinceLastService,
        serviceIntervalMeter: candidate.serviceIntervalMeter,
        complianceDocType: candidate.complianceDocType,
        entityId: candidate.entityId,
      })
    } else if (candidate.entityType === 'labour_payout') {
      messageText = generateLabourPayoutWhatsAppText({
        reference: candidate.entityReference,
        projectName: candidate.projectName,
        weekStart: candidate.customPayload?.weekStart,
        weekEnd: candidate.customPayload?.weekEnd || candidate.targetDate,
        totalWorkers: candidate.totalWorkers,
        totalMandays: candidate.totalMandays,
        totalOTHours: candidate.totalOTHours,
        regularWages: candidate.regularWages,
        otWages: candidate.otWages,
        grossWageLiability: candidate.grossWageLiability,
        bocwCessEstimate: candidate.bocwCessEstimate,
        entityId: candidate.entityId,
      })
    } else {
      messageText = `⚠️ CONTRACTUAL ALERT: ${candidate.entityReference} is ${candidate.urgencyLabel}. Target date: ${candidate.targetDate}.`
    }

    // Dry-run support: Skip real API call and DB insert
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

    // Execute live Meta Cloud API WhatsApp dispatch
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

      // Record into deduplication ledger
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

/**
 * 1. Morning Autonomous Scan:
 * Evaluates securities, contract notice deadlines, delayed RA bills, supplier credit limits,
 * inventory stock reorders, and fleet compliance / maintenance.
 */
export async function runDailyMorningScan(
  supabase: SupabaseClient,
  options: DispatchEngineOptions = {}
): Promise<ScanRunSummary> {
  const [
    securitiesCandidates,
    noticesCandidates,
    raBillsCandidates,
    suppliersCandidates,
    inventoryCandidates,
    machineryCandidates,
  ] = await Promise.all([
    scanSecurities(supabase, options.asOfDateStr),
    scanNotices(supabase, options.asOfDateStr),
    scanRABills(supabase, options.asOfDateStr),
    scanSuppliers(supabase, options.asOfDateStr),
    scanInventory(supabase, options.asOfDateStr),
    scanMachinery(supabase, options.asOfDateStr),
  ])

  const allCandidates: AlertCandidate[] = [
    ...securitiesCandidates,
    ...noticesCandidates,
    ...raBillsCandidates,
    ...suppliersCandidates,
    ...inventoryCandidates,
    ...machineryCandidates,
  ]

  return processCandidates(supabase, allCandidates, options, 'morning-scan')
}

/**
 * 2. Evening Autonomous Scan (8:00 PM IST Cutoff):
 * Evaluates active projects missing Daily Progress Reports (DPR).
 */
export async function runDailyEveningScan(
  supabase: SupabaseClient,
  options: DispatchEngineOptions = {}
): Promise<ScanRunSummary> {
  const dprCandidates = await scanMissingDPRs(supabase, options.asOfDateStr)
  return processCandidates(supabase, dprCandidates, options, 'evening-scan')
}

/**
 * 3. Saturday Labour Payout Scan (4:00 PM IST):
 * Aggregates weekly labour muster roll liabilities & BOCW Cess.
 */
export async function runSaturdayLabourScan(
  supabase: SupabaseClient,
  options: DispatchEngineOptions = {}
): Promise<ScanRunSummary> {
  const labourCandidates = await scanWeeklyLabourPayout(supabase, options.asOfDateStr)
  return processCandidates(supabase, labourCandidates, options, 'saturday-labour-scan')
}

/**
 * 4. Full Comprehensive Scan (All Domains):
 * Used for diagnostic dry-runs, testing, and manual platform sweeps.
 */
export async function runFullScan(
  supabase: SupabaseClient,
  options: DispatchEngineOptions = {}
): Promise<ScanRunSummary> {
  const [
    securitiesCandidates,
    noticesCandidates,
    raBillsCandidates,
    suppliersCandidates,
    inventoryCandidates,
    machineryCandidates,
    dprCandidates,
    labourCandidates,
  ] = await Promise.all([
    scanSecurities(supabase, options.asOfDateStr),
    scanNotices(supabase, options.asOfDateStr),
    scanRABills(supabase, options.asOfDateStr),
    scanSuppliers(supabase, options.asOfDateStr),
    scanInventory(supabase, options.asOfDateStr),
    scanMachinery(supabase, options.asOfDateStr),
    scanMissingDPRs(supabase, options.asOfDateStr),
    scanWeeklyLabourPayout(supabase, options.asOfDateStr),
  ])

  const allCandidates: AlertCandidate[] = [
    ...securitiesCandidates,
    ...noticesCandidates,
    ...raBillsCandidates,
    ...suppliersCandidates,
    ...inventoryCandidates,
    ...machineryCandidates,
    ...dprCandidates,
    ...labourCandidates,
  ]

  return processCandidates(supabase, allCandidates, options, 'full-scan')
}
