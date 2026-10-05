/**
 * DPR Evening Missing Scanner (Phase 3)
 * Scans active construction projects that have not logged a Daily Progress Report (DPR)
 * as of the 8:00 PM evening closeout cutoff.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { AlertCandidate } from '../types'

export async function scanMissingDPRs(
  supabase: SupabaseClient,
  asOfDateStr?: string
): Promise<AlertCandidate[]> {
  const asOf = asOfDateStr || new Date().toISOString().split('T')[0]
  const candidates: AlertCandidate[] = []

  // 1. Try dedicated Phase 3 RPC first
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'get_autonomous_operations_candidates',
      { p_as_of_date: asOf }
    )

    if (!rpcError && rpcData && Array.isArray(rpcData.missing_dprs)) {
      for (const item of rpcData.missing_dprs) {
        candidates.push({
          entityType: 'dpr',
          entityId: item.project_id,
          entityReference: item.project_name || item.project_code || 'Site Package',
          organizationId: item.organization_id,
          projectId: item.project_id,
          projectName: item.project_name,
          targetDate: asOf,
          daysRemaining: 0,
          milestoneKey: 'DPR_MISSING_EVENING',
          urgencyLabel: 'MISSING (8:00 PM CUTOFF)',
          customPayload: {
            logDate: asOf,
          },
        })
      }
      return candidates
    }
  } catch (err) {
    // Fall back to direct query
  }

  // 2. Direct query fallback
  try {
    const { data: activeProjects, error: projError } = await supabase
      .from('projects')
      .select('id, name, code, organization_id')
      .eq('status', 'active')
      .eq('archived', false)

    if (projError || !activeProjects || activeProjects.length === 0) {
      return candidates
    }

    const { data: existingDprs, error: dprError } = await supabase
      .from('daily_progress_reports')
      .select('project_id')
      .eq('report_date', asOf)

    if (dprError) {
      console.warn('[DPR SCANNER] Error fetching daily_progress_reports:', dprError.message)
      return candidates
    }

    const loggedProjectIds = new Set((existingDprs || []).map((d: any) => d.project_id))

    for (const project of activeProjects) {
      if (!loggedProjectIds.has(project.id)) {
        candidates.push({
          entityType: 'dpr',
          entityId: project.id,
          entityReference: project.name || project.code || 'Site Package',
          organizationId: project.organization_id,
          projectId: project.id,
          projectName: project.name,
          targetDate: asOf,
          daysRemaining: 0,
          milestoneKey: 'DPR_MISSING_EVENING',
          urgencyLabel: 'MISSING (8:00 PM CUTOFF)',
          customPayload: {
            logDate: asOf,
          },
        })
      }
    }
  } catch (err: any) {
    console.error('[DPR SCANNER] Unhandled exception:', err.message)
  }

  return candidates
}
