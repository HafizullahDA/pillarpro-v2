/**
 * Contractual Correspondence & Notice Deadlines Scanner
 * Evaluates pending notice deadlines under CPWD GCC Clause 5 / FIDIC Sub-Clause 20.1.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { AlertCandidate } from '../types'
import { evaluateMilestone } from '../milestoneEvaluator'

export async function scanNotices(
  supabase: SupabaseClient,
  asOfDateStr?: string
): Promise<AlertCandidate[]> {
  const candidates: AlertCandidate[] = []

  let notices: any[] | null = null

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'get_autonomous_alert_candidates',
      { p_as_of_date: asOfDateStr || new Date().toISOString().split('T')[0] }
    )
    if (!rpcError && rpcData && Array.isArray(rpcData.notices)) {
      notices = rpcData.notices.map((n: any) => ({
        ...n,
        projects: { id: n.project_id, name: n.project_name, organization_id: n.organization_id },
      }))
    }
  } catch {
    // Graceful fallback to direct query
  }

  if (!notices) {
    const { data, error } = await supabase
      .from('correspondence')
      .select(`
        id,
        project_id,
        letter_number,
        reference_number,
        direction,
        subject,
        status,
        response_deadline,
        response_required,
        responded_date,
        clause_reference,
        projects (
          id,
          name,
          organization_id
        )
      `)
      .eq('response_required', true)
      .is('responded_date', null)
      .neq('status', 'CLOSED')
      .not('response_deadline', 'is', null)

    if (error) {
      console.warn('[NOTICES SCANNER] Error fetching correspondence:', error.message)
      return candidates
    }
    notices = data
  }

  if (!notices) return candidates

  for (const n of notices) {
    if (!n.response_deadline) continue

    const { daysRemaining, milestoneKey, urgencyLabel } = evaluateMilestone(
      n.response_deadline,
      asOfDateStr
    )

    if (milestoneKey) {
      const proj = Array.isArray(n.projects) ? n.projects[0] : n.projects
      const letterRef = n.letter_number || n.reference_number || `Notice-${n.id.slice(0, 8)}`

      candidates.push({
        entityType: 'correspondence',
        entityId: n.id,
        entityReference: letterRef,
        organizationId: proj?.organization_id || null,
        projectId: n.project_id || null,
        projectName: proj?.name || 'Project',
        targetDate: n.response_deadline,
        daysRemaining,
        milestoneKey,
        urgencyLabel,
        letterNumber: letterRef,
        subject: n.subject || 'Contractual Notice',
        clauseCitation: n.clause_reference || 'CPWD GCC Clause 5.2 / FIDIC Sub-Clause 20.1',
      })
    }
  }

  return candidates
}
