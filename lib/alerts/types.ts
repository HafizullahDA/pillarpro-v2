/**
 * Autonomous Alerts Engine — Type Definitions
 * Shared types for scanners, milestone evaluation, deduplication, and dispatch.
 */

export type AlertEntityType =
  | 'bank_guarantee'
  | 'correspondence'
  | 'ra_bill'
  | 'supplier'
  | 'machinery'
  | 'inventory'
  | 'dpr'
  | 'labour_payout'

export type MilestoneKey =
  | 'T_MINUS_30'
  | 'T_MINUS_15'
  | 'T_MINUS_7'
  | 'T_MINUS_3'
  | 'T_MINUS_1'
  | 'T_0'
  | 'OVERDUE'
  | 'OVERDUE_30D'
  | 'OVERDUE_45D'
  | 'OVERDUE_60D'
  | 'CREDIT_85_PERCENT'
  | 'CREDIT_BREACHED'
  // Phase 3 Operations & Fleet milestones:
  | 'DPR_MISSING_EVENING'
  | 'STOCK_LOW'
  | 'STOCK_CRITICAL'
  | 'SERVICE_DUE'
  | 'WEEKLY_LABOUR_PAYOUT'

export type AlertDispatchStatus = 'dispatched' | 'failed' | 'skipped'

export interface AlertCandidate {
  entityType: AlertEntityType
  entityId: string
  entityReference: string
  organizationId?: string | null
  projectId?: string | null
  projectName?: string
  targetDate: string
  daysRemaining: number
  milestoneKey: MilestoneKey
  urgencyLabel: string
  recipientPhone?: string
  metaAmount?: number
  issuingBank?: string
  depositType?: string
  letterNumber?: string
  subject?: string
  clauseCitation?: string
  // Phase 2 Cash Flow & Vendor additions:
  workCertifiedAmount?: number
  retentionAmount?: number
  netPayableAmount?: number
  amountReceived?: number
  outstandingBalance?: number
  creditLimit?: number
  creditUtilizationPercent?: number
  paymentMode?: string
  transactionRef?: string
  // Phase 3 Operations & Fleet additions:
  itemName?: string
  itemCode?: string
  currentStock?: number
  minimumStock?: number
  unit?: string
  assetName?: string
  registrationNumber?: string
  currentMeter?: number
  lastServiceMeter?: number
  serviceIntervalMeter?: number
  hoursSinceLastService?: number
  complianceDocType?: 'insurance' | 'fitness' | 'puc' | 'service'
  totalWorkers?: number
  totalMandays?: number
  totalOTHours?: number
  regularWages?: number
  otWages?: number
  grossWageLiability?: number
  bocwCessEstimate?: number
  customPayload?: Record<string, any>
}

export interface DispatchLogRecord {
  id?: string
  organization_id?: string | null
  project_id?: string | null
  entity_type: AlertEntityType
  entity_id: string
  entity_reference?: string
  milestone_key: MilestoneKey
  channel: 'whatsapp'
  recipient_phone: string
  status: AlertDispatchStatus
  error_message?: string | null
  meta_message_id?: string | null
  payload_snapshot?: Record<string, any>
  dispatched_at?: string
}

export interface ScanRunSummary {
  runId: string
  timestamp: string
  totalScanned: number
  eligibleCandidates: number
  dispatchedCount: number
  skippedCount: number // skipped due to deduplication ledger
  failedCount: number
  details: Array<{
    entityType: AlertEntityType
    entityId: string
    entityReference: string
    milestoneKey: MilestoneKey
    status: AlertDispatchStatus
    recipientPhone: string
    metaMessageId?: string
    error?: string
  }>
}
