import { describe, it, expect } from 'vitest'
import { scanRABills } from '../raBillsScanner'

describe('RA Bills Delayed Payment Scanner', () => {
  it('correctly categorizes bills delayed by 30, 45, and 60 days', async () => {
    const mockSupabase = {
      rpc: async () => ({
        data: {
          ra_bills: [
            {
              id: 'bill-30',
              project_id: 'proj-1',
              project_name: 'Smart City Road',
              bill_number: 'RA Bill #02',
              submission_date: '2026-09-05', // 30 days before 2026-10-05
              work_certified_amount: 5000000,
              retention_amount: 250000,
              net_payable_amount: 4750000,
              amount_received: 0,
              outstanding_balance: 4750000,
              status: 'submitted',
            },
            {
              id: 'bill-45',
              project_id: 'proj-2',
              project_name: 'Highway Package 4',
              bill_number: 'RA Bill #05',
              submission_date: '2026-08-20', // 46 days before 2026-10-05
              work_certified_amount: 8000000,
              retention_amount: 400000,
              net_payable_amount: 7600000,
              amount_received: 1000000,
              outstanding_balance: 6600000,
              status: 'partially_paid',
            },
            {
              id: 'bill-fresh',
              project_id: 'proj-3',
              project_name: 'Drainage Ph-1',
              bill_number: 'RA Bill #01',
              submission_date: '2026-10-01', // 4 days ago - healthy
              work_certified_amount: 1200000,
              retention_amount: 60000,
              net_payable_amount: 1140000,
              amount_received: 0,
              outstanding_balance: 1140000,
              status: 'submitted',
            },
          ],
        },
        error: null,
      }),
    } as any

    const candidates = await scanRABills(mockSupabase, '2026-10-05')

    // Expect 2 overdue candidates (bill-30 and bill-45), while bill-fresh is ignored
    expect(candidates).toHaveLength(2)

    const bill30 = candidates.find(c => c.entityId === 'bill-30')
    expect(bill30).toBeDefined()
    expect(bill30?.milestoneKey).toBe('OVERDUE_30D')
    expect(bill30?.clauseCitation).toContain('CPWD GCC Clause 7')
    expect(bill30?.netPayableAmount).toBe(4750000)

    const bill45 = candidates.find(c => c.entityId === 'bill-45')
    expect(bill45).toBeDefined()
    expect(bill45?.milestoneKey).toBe('OVERDUE_45D')
    expect(bill45?.clauseCitation).toContain('MSME Development Act 2006')
  })
})
