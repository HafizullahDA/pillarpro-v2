/**
 * Bank Guarantees & Contractual Securities Scanner
 * Scans active Bank Guarantees, Retention FDRs, and CAR policies approaching expiry.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { AlertCandidate } from '../types'
import { evaluateMilestone } from '../milestoneEvaluator'

export async function scanSecurities(
  supabase: SupabaseClient,
  asOfDateStr?: string
): Promise<AlertCandidate[]> {
  const candidates: AlertCandidate[] = []

  // 1. Attempt RPC first (bypasses RLS in autonomous cron context)
  let deposits: any[] | null = null

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'get_autonomous_alert_candidates',
      { p_as_of_date: asOfDateStr || new Date().toISOString().split('T')[0] }
    )
    if (!rpcError && rpcData && Array.isArray(rpcData.securities)) {
      deposits = rpcData.securities.map((s: any) => ({
        ...s,
        projects: { id: s.project_id, name: s.project_name, organization_id: s.organization_id },
      }))
    }
  } catch {
    // Graceful fallback to direct query
  }

  if (!deposits) {
    const { data, error } = await supabase
      .from('security_deposits')
      .select(`
        id,
        project_id,
        deposit_type,
        reference_number,
        issuing_bank,
        amount,
        expiry_date,
        status,
        projects (
          id,
          name,
          organization_id
        )
      `)
      .eq('status', 'active')
      .not('expiry_date', 'is', null)

    if (error) {
      console.warn('[SECURITIES SCANNER] Error fetching security deposits:', error.message)
      return candidates
    }
    deposits = data
  }

  for (const dep of deposits) {
    if (!dep.expiry_date) continue

    const { daysRemaining, milestoneKey, urgencyLabel } = evaluateMilestone(
      dep.expiry_date,
      asOfDateStr
    )

    // Only include if an active milestone was reached
    if (milestoneKey) {
      const proj = Array.isArray(dep.projects) ? dep.projects[0] : dep.projects

      candidates.push({
        entityType: 'bank_guarantee',
        entityId: dep.id,
        entityReference: dep.reference_number || `Deposit-${dep.id.slice(0, 8)}`,
        organizationId: proj?.organization_id || null,
        projectId: dep.project_id || null,
        projectName: proj?.name || 'Project',
        targetDate: dep.expiry_date,
        daysRemaining,
        milestoneKey,
        urgencyLabel,
        metaAmount: dep.amount ? Number(dep.amount) : undefined,
        issuingBank: dep.issuing_bank || undefined,
        depositType: dep.deposit_type || 'performance_bank_guarantee',
        clauseCitation: 'CPWD GCC Clause 1A / FIDIC Sub-Clause 4.2',
      })
    }
  }

  return candidates
}
