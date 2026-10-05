/**
 * Supplier Credit Limit & Material Khata Scanner
 * Monitors supplier ledger balances against agreed credit limits (>85% utilization).
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { AlertCandidate, MilestoneKey } from '../types'

export async function scanSuppliers(
  supabase: SupabaseClient,
  asOfDateStr?: string
): Promise<AlertCandidate[]> {
  const candidates: AlertCandidate[] = []
  const todayStr = asOfDateStr || new Date().toISOString().split('T')[0]

  // 1. Attempt RPC first (bypasses RLS in autonomous cron context)
  let suppliers: any[] | null = null

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'get_autonomous_cashflow_candidates',
      { p_as_of_date: todayStr }
    )
    if (!rpcError && rpcData && Array.isArray(rpcData.suppliers)) {
      suppliers = rpcData.suppliers
    }
  } catch {
    // Graceful fallback to direct query
  }

  // Fallback direct table/view query
  if (!suppliers) {
    const { data, error } = await supabase
      .from('supplier_summary')
      .select(`
        id,
        name,
        contact_number,
        credit_limit,
        total_procured,
        total_paid,
        outstanding_balance,
        credit_utilization_percent,
        organization_id
      `)
      .not('credit_limit', 'is', null)
      .gt('credit_limit', 0)

    if (error) {
      console.warn('[SUPPLIERS SCANNER] Error querying supplier_summary:', error.message)
      return candidates
    }
    suppliers = data
  }

  if (!suppliers) return candidates

  for (const s of suppliers) {
    const limit = Number(s.credit_limit) || 0
    if (limit <= 0) continue

    const balance = Number(s.outstanding_balance) || 0
    const utilization = Number(s.credit_utilization_percent) || (limit > 0 ? (balance / limit) * 100 : 0)

    let milestoneKey: MilestoneKey | null = null
    let urgencyLabel = ''

    if (utilization >= 100) {
      milestoneKey = 'CREDIT_BREACHED'
      urgencyLabel = `CREDIT LIMIT EXCEEDED (${utilization.toFixed(1)}% OF ₹${limit.toLocaleString('en-IN')})`
    } else if (utilization >= 85) {
      milestoneKey = 'CREDIT_85_PERCENT'
      urgencyLabel = `CREDIT LIMIT CRITICAL (${utilization.toFixed(1)}% OF ₹${limit.toLocaleString('en-IN')})`
    }

    if (milestoneKey) {
      candidates.push({
        entityType: 'supplier',
        entityId: s.id,
        entityReference: s.name,
        organizationId: s.organization_id || null,
        targetDate: todayStr,
        daysRemaining: 0,
        milestoneKey,
        urgencyLabel,
        recipientPhone: s.contact_number || undefined,
        creditLimit: limit,
        outstandingBalance: balance,
        creditUtilizationPercent: utilization,
        metaAmount: balance,
        clauseCitation: 'Vendor Credit Policy / Material Supply Agreement',
      })
    }
  }

  return candidates
}
