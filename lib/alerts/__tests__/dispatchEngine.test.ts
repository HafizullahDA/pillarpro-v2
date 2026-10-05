import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  runDailyMorningScan,
  runDailyEveningScan,
  runSaturdayLabourScan,
  runFullScan,
} from '../dispatchEngine'
import * as securitiesScanner from '../scanners/securitiesScanner'
import * as noticesScanner from '../scanners/noticesScanner'
import * as raBillsScanner from '../scanners/raBillsScanner'
import * as suppliersScanner from '../scanners/suppliersScanner'
import * as inventoryScanner from '../scanners/inventoryScanner'
import * as machineryScanner from '../scanners/machineryScanner'
import * as dprScanner from '../scanners/dprScanner'
import * as labourPayoutScanner from '../scanners/labourPayoutScanner'
import * as ledger from '../ledger'

describe('Autonomous Alerts Dispatch Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(securitiesScanner, 'scanSecurities').mockResolvedValue([])
    vi.spyOn(noticesScanner, 'scanNotices').mockResolvedValue([])
    vi.spyOn(raBillsScanner, 'scanRABills').mockResolvedValue([])
    vi.spyOn(suppliersScanner, 'scanSuppliers').mockResolvedValue([])
    vi.spyOn(inventoryScanner, 'scanInventory').mockResolvedValue([])
    vi.spyOn(machineryScanner, 'scanMachinery').mockResolvedValue([])
    vi.spyOn(dprScanner, 'scanMissingDPRs').mockResolvedValue([])
    vi.spyOn(labourPayoutScanner, 'scanWeeklyLabourPayout').mockResolvedValue([])
    vi.spyOn(ledger, 'isMilestoneDispatched').mockResolvedValue(false)
  })

  it('runs dry-run scan without triggering live Meta calls and reports candidate metrics', async () => {
    vi.spyOn(securitiesScanner, 'scanSecurities').mockResolvedValue([
      {
        entityType: 'bank_guarantee',
        entityId: 'bg-123',
        entityReference: 'PBG #SBI-2024-91',
        organizationId: 'org-1',
        projectId: 'proj-1',
        projectName: 'Smart City Road Project',
        targetDate: '2026-10-12',
        daysRemaining: 7,
        milestoneKey: 'T_MINUS_7',
        urgencyLabel: '7d REMAINING (CRITICAL 7-DAY ALERT)',
        metaAmount: 2500000,
        issuingBank: 'State Bank of India',
        depositType: 'performance_bank_guarantee',
      },
    ])

    const mockSupabase = {} as any

    const summary = await runDailyMorningScan(mockSupabase, {
      dryRun: true,
      overrideRecipientPhone: '+919999999999',
    })

    expect(summary.totalScanned).toBe(1)
    expect(summary.eligibleCandidates).toBe(1)
    expect(summary.dispatchedCount).toBe(1)
    expect(summary.skippedCount).toBe(0)
    expect(summary.failedCount).toBe(0)
    expect(summary.details[0].milestoneKey).toBe('T_MINUS_7')
    expect(summary.details[0].entityReference).toBe('PBG #SBI-2024-91')
  })

  it('correctly dispatches Phase 2 RA bill and supplier credit alerts', async () => {
    vi.spyOn(raBillsScanner, 'scanRABills').mockResolvedValue([
      {
        entityType: 'ra_bill',
        entityId: 'rab-55',
        entityReference: 'RA Bill #04',
        projectName: 'Four Lane Bypass',
        targetDate: '2026-08-20',
        daysRemaining: -46,
        milestoneKey: 'OVERDUE_45D',
        urgencyLabel: '46d DELAYED (MSME STATUTORY INTEREST)',
        workCertifiedAmount: 5000000,
        netPayableAmount: 4750000,
        outstandingBalance: 4750000,
      },
    ])

    vi.spyOn(suppliersScanner, 'scanSuppliers').mockResolvedValue([
      {
        entityType: 'supplier',
        entityId: 'sup-88',
        entityReference: 'J&K Cements Ltd',
        targetDate: '2026-10-05',
        daysRemaining: 0,
        milestoneKey: 'CREDIT_85_PERCENT',
        urgencyLabel: 'CREDIT LIMIT CRITICAL (91%)',
        creditLimit: 1000000,
        outstandingBalance: 910000,
        creditUtilizationPercent: 91,
      },
    ])

    const mockSupabase = {} as any

    const summary = await runDailyMorningScan(mockSupabase, {
      dryRun: true,
      overrideRecipientPhone: '+919999999999',
    })

    expect(summary.totalScanned).toBe(2)
    expect(summary.dispatchedCount).toBe(2)
    expect(summary.details[0].milestoneKey).toBe('OVERDUE_45D')
    expect(summary.details[1].milestoneKey).toBe('CREDIT_85_PERCENT')
  })

  it('runs Phase 3 evening scan for missing DPRs', async () => {
    vi.spyOn(dprScanner, 'scanMissingDPRs').mockResolvedValue([
      {
        entityType: 'dpr',
        entityId: 'proj-88',
        entityReference: 'Highway NH-44 Widening',
        projectName: 'Highway NH-44 Widening',
        targetDate: '2026-10-05',
        daysRemaining: 0,
        milestoneKey: 'DPR_MISSING_EVENING',
        urgencyLabel: 'MISSING (8:00 PM CUTOFF)',
      },
    ])

    const mockSupabase = {} as any

    const summary = await runDailyEveningScan(mockSupabase, {
      dryRun: true,
      overrideRecipientPhone: '+919999999999',
    })

    expect(summary.totalScanned).toBe(1)
    expect(summary.dispatchedCount).toBe(1)
    expect(summary.details[0].entityType).toBe('dpr')
    expect(summary.details[0].milestoneKey).toBe('DPR_MISSING_EVENING')
  })

  it('runs Phase 3 Saturday weekly labour payout scan', async () => {
    vi.spyOn(labourPayoutScanner, 'scanWeeklyLabourPayout').mockResolvedValue([
      {
        entityType: 'labour_payout',
        entityId: 'proj-1_week_2026-09-29',
        entityReference: 'Highway NH-44 (Weekly Payout)',
        projectName: 'Highway NH-44',
        targetDate: '2026-10-05',
        daysRemaining: 0,
        milestoneKey: 'WEEKLY_LABOUR_PAYOUT',
        urgencyLabel: 'SATURDAY LABOUR PAYOUT DUE',
        totalWorkers: 30,
        grossWageLiability: 105000,
        bocwCessEstimate: 1050,
      },
    ])

    const mockSupabase = {} as any

    const summary = await runSaturdayLabourScan(mockSupabase, {
      dryRun: true,
      overrideRecipientPhone: '+919999999999',
    })

    expect(summary.totalScanned).toBe(1)
    expect(summary.dispatchedCount).toBe(1)
    expect(summary.details[0].entityType).toBe('labour_payout')
  })

  it('skips candidates when already recorded in deduplication ledger', async () => {
    vi.spyOn(securitiesScanner, 'scanSecurities').mockResolvedValue([
      {
        entityType: 'bank_guarantee',
        entityId: 'bg-123',
        entityReference: 'PBG #SBI-2024-91',
        targetDate: '2026-10-12',
        daysRemaining: 7,
        milestoneKey: 'T_MINUS_7',
        urgencyLabel: '7d REMAINING (CRITICAL)',
      },
    ])

    vi.spyOn(ledger, 'isMilestoneDispatched').mockResolvedValue(true)

    const mockSupabase = {} as any

    const summary = await runDailyMorningScan(mockSupabase, {
      dryRun: true,
      overrideRecipientPhone: '+919999999999',
    })

    expect(summary.totalScanned).toBe(1)
    expect(summary.dispatchedCount).toBe(0)
    expect(summary.skippedCount).toBe(1)
    expect(summary.details[0].status).toBe('skipped')
  })

  it('marks candidate as failed if no phone number is configured', async () => {
    vi.spyOn(securitiesScanner, 'scanSecurities').mockResolvedValue([
      {
        entityType: 'bank_guarantee',
        entityId: 'bg-999',
        entityReference: 'FDR #PNB-2024-11',
        targetDate: '2026-10-12',
        daysRemaining: 7,
        milestoneKey: 'T_MINUS_7',
        urgencyLabel: '7d REMAINING',
        recipientPhone: undefined,
      },
    ])

    const mockSupabase = {} as any
    const originalEnv = process.env.WHATSAPP_ALERT_RECIPIENT_PHONE
    delete process.env.WHATSAPP_ALERT_RECIPIENT_PHONE

    const summary = await runDailyMorningScan(mockSupabase, {
      dryRun: true,
    })

    process.env.WHATSAPP_ALERT_RECIPIENT_PHONE = originalEnv

    expect(summary.failedCount).toBe(1)
    expect(summary.details[0].status).toBe('failed')
    expect(summary.details[0].error).toContain('No recipient phone number')
  })
})
