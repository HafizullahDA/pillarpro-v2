/**
 * RA Bills Delayed Payment & Statutory Aging Scanner
 * Scans submitted and partially paid government Running Account bills
 * exceeding CPWD Clause 7 (30-day payment) and MSME Act (45-day statutory interest).
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { AlertCandidate, MilestoneKey } from '../types'

export async function scanRABills(
  supabase: SupabaseClient,
  asOfDateStr?: string
): Promise<AlertCandidate[]> {
  const candidates: AlertCandidate[] = []
  const todayStr = asOfDateStr || new Date().toISOString().split('T')[0]
  const today = new Date(todayStr)
  today.setHours(0, 0, 0, 0)

  // 1. Attempt RPC first (bypasses RLS in autonomous cron context)
  let bills: any[] | null = null

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'get_autonomous_cashflow_candidates',
      { p_as_of_date: todayStr }
    )
    if (!rpcError && rpcData && Array.isArray(rpcData.ra_bills)) {
      bills = rpcData.ra_bills.map((b: any) => ({
        ...b,
        projects: { id: b.project_id, name: b.project_name, organization_id: b.organization_id },
      }))
    }
  } catch {
    // Graceful fallback to direct query
  }

  // Fallback direct table query
  if (!bills) {
    const { data, error } = await supabase
      .from('ra_bills')
      .select(`
        id,
        project_id,
        bill_number,
        submission_date,
        work_certified_amount,
        retention_amount,
        net_payable_amount,
        amount_received,
        outstanding_balance,
        status,
        projects (
          id,
          name,
          organization_id
        )
      `)
      .in('status', ['submitted', 'partially_paid'])

    if (error) {
      console.warn('[RA BILLS SCANNER] Error querying ra_bills:', error.message)
      return candidates
    }
    bills = data
  }

  if (!bills) return candidates

  for (const b of bills) {
    if (!b.submission_date) continue

    const subDate = new Date(b.submission_date)
    subDate.setHours(0, 0, 0, 0)
    const diffMs = today.getTime() - subDate.getTime()
    const daysElapsed = Math.round(diffMs / (24 * 60 * 60 * 1000))

    let milestoneKey: MilestoneKey | null = null
    let urgencyLabel = ''

    if (daysElapsed >= 60) {
      milestoneKey = 'OVERDUE_60D'
      urgencyLabel = `${daysElapsed}d DELAYED (>60d SEVERE CASHFLOW ESCALATION)`
    } else if (daysElapsed >= 45) {
      milestoneKey = 'OVERDUE_45D'
      urgencyLabel = `${daysElapsed}d DELAYED (MSME 45-DAY STATUTORY INTEREST TRIGGERED)`
    } else if (daysElapsed >= 30) {
      milestoneKey = 'OVERDUE_30D'
      urgencyLabel = `${daysElapsed}d DELAYED (CPWD CLAUSE 7 PAYMENT PERIOD EXCEEDED)`
    }

    if (milestoneKey) {
      const proj = Array.isArray(b.projects) ? b.projects[0] : b.projects

      candidates.push({
        entityType: 'ra_bill',
        entityId: b.id,
        entityReference: b.bill_number || `RA-Bill-${b.id.slice(0, 8)}`,
        organizationId: proj?.organization_id || b.organization_id || null,
        projectId: b.project_id || null,
        projectName: proj?.name || 'Project',
        targetDate: b.submission_date,
        daysRemaining: -daysElapsed,
        milestoneKey,
        urgencyLabel,
        workCertifiedAmount: Number(b.work_certified_amount) || 0,
        retentionAmount: Number(b.retention_amount) || 0,
        netPayableAmount: Number(b.net_payable_amount) || 0,
        amountReceived: Number(b.amount_received) || 0,
        outstandingBalance: Number(b.outstanding_balance) || 0,
        metaAmount: Number(b.outstanding_balance) || Number(b.net_payable_amount) || 0,
        clauseCitation:
          daysElapsed >= 45
            ? 'MSME Development Act 2006 (Sec 15 & 16) / CPWD GCC Clause 7'
            : 'CPWD GCC Clause 7 (30-Day Payment Mandate)',
      })
    }
  }

  return candidates
}
