import { describe, it, expect, vi } from 'vitest'
import { runDailyMorningScan } from '../dispatchEngine'
import * as securitiesScanner from '../scanners/securitiesScanner'
import * as noticesScanner from '../scanners/noticesScanner'
import * as ledger from '../ledger'

describe('Autonomous Alerts Dispatch Engine', () => {
  it('runs dry-run scan without triggering live Meta calls and reports candidate metrics', async () => {
    // Mock scanners
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

    vi.spyOn(noticesScanner, 'scanNotices').mockResolvedValue([])
    vi.spyOn(ledger, 'isMilestoneDispatched').mockResolvedValue(false)

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

    vi.spyOn(noticesScanner, 'scanNotices').mockResolvedValue([])
    // Mock that T_MINUS_7 was ALREADY dispatched today
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

    vi.spyOn(noticesScanner, 'scanNotices').mockResolvedValue([])

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
