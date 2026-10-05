/**
 * Saturday Labour Payout Summary Scanner (Phase 3)
 * Aggregates weekly labour muster roll attendance, overtime, gross wage liabilities,
 * and 1% BOCW Cess provision for site supervisors and management.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { AlertCandidate } from '../types'

export async function scanWeeklyLabourPayout(
  supabase: SupabaseClient,
  asOfDateStr?: string
): Promise<AlertCandidate[]> {
  const asOf = asOfDateStr || new Date().toISOString().split('T')[0]
  const candidates: AlertCandidate[] = []

  // Compute Monday of the current week
  const asOfDate = new Date(asOf)
  const dayOfWeek = asOfDate.getDay() // 0 = Sun, 1 = Mon ... 6 = Sat
  // Distance to previous Monday (if Sunday (0), go back 6 days)
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const mondayDate = new Date(asOfDate)
  mondayDate.setDate(asOfDate.getDate() + diffToMonday)
  const weekStart = mondayDate.toISOString().split('T')[0]

  // 1. Try dedicated Phase 3 RPC first
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'get_autonomous_operations_candidates',
      { p_as_of_date: asOf }
    )

    if (!rpcError && rpcData && Array.isArray(rpcData.weekly_labour_summary)) {
      for (const summary of rpcData.weekly_labour_summary) {
        if (Number(summary.total_workers || 0) > 0) {
          candidates.push({
            entityType: 'labour_payout',
            entityId: `${summary.project_id}_week_${summary.week_start || weekStart}`,
            entityReference: `${summary.project_name} (Weekly Payout)`,
            organizationId: summary.organization_id,
            projectId: summary.project_id,
            projectName: summary.project_name,
            targetDate: asOf,
            daysRemaining: 0,
            milestoneKey: 'WEEKLY_LABOUR_PAYOUT',
            urgencyLabel: 'SATURDAY LABOUR PAYOUT DUE',
            totalWorkers: Number(summary.total_workers || 0),
            totalMandays: Number(summary.total_mandays || 0),
            totalOTHours: Number(summary.total_ot_hours || 0),
            regularWages: Number(summary.regular_wages || 0),
            otWages: Number(summary.ot_wages || 0),
            grossWageLiability: Number(summary.gross_wage_liability || 0),
            bocwCessEstimate: Number(summary.bocw_cess_estimate || 0),
            customPayload: {
              weekStart: summary.week_start || weekStart,
              weekEnd: asOf,
            },
          })
        }
      }
      return candidates
    }
  } catch (err) {
    // Fall back to direct query
  }

  // 2. Direct query fallback
  try {
    const { data: attendanceLogs, error: attError } = await supabase
      .from('attendance')
      .select('project_id, worker_id, date, status, present, overtime_hours, workers(daily_wage_rate), projects(name, organization_id)')
      .gte('date', weekStart)
      .lte('date', asOf)

    if (attError) {
      console.warn('[LABOUR PAYOUT SCANNER] Error querying attendance:', attError.message)
      return candidates
    }

    if (!attendanceLogs || attendanceLogs.length === 0) {
      return candidates
    }

    // Group by project_id
    const projectMap = new Map<
      string,
      {
        projectId: string
        projectName: string
        organizationId?: string
        workersSet: Set<string>
        totalMandays: number
        totalOTHours: number
        regularWages: number
        otWages: number
      }
    >()

    for (const record of attendanceLogs as any[]) {
      const pid = record.project_id
      if (!pid) continue

      if (!projectMap.has(pid)) {
        projectMap.set(pid, {
          projectId: pid,
          projectName: record.projects?.name || 'Site Project',
          organizationId: record.projects?.organization_id,
          workersSet: new Set(),
          totalMandays: 0,
          totalOTHours: 0,
          regularWages: 0,
          otWages: 0,
        })
      }

      const pEntry = projectMap.get(pid)!
      if (record.worker_id) {
        pEntry.workersSet.add(record.worker_id)
      }

      const rate = Number(record.workers?.daily_wage_rate || 0)
      const otHours = Number(record.overtime_hours || 0)

      let dayFraction = 0
      if (record.status === 'half_day') {
        dayFraction = 0.5
      } else if (record.present !== false) {
        dayFraction = 1.0
      }

      pEntry.totalMandays += dayFraction
      pEntry.totalOTHours += otHours
      pEntry.regularWages += dayFraction * rate
      pEntry.otWages += (otHours / 7.0) * rate
    }

    projectMap.forEach((data, pid) => {
      if (data.workersSet.size === 0) return

      const gross = Math.round((data.regularWages + data.otWages) * 100) / 100
      const cess = Math.round(gross * 0.01 * 100) / 100

      candidates.push({
        entityType: 'labour_payout',
        entityId: `${pid}_week_${weekStart}`,
        entityReference: `${data.projectName} (Weekly Payout)`,
        organizationId: data.organizationId,
        projectId: pid,
        projectName: data.projectName,
        targetDate: asOf,
        daysRemaining: 0,
        milestoneKey: 'WEEKLY_LABOUR_PAYOUT',
        urgencyLabel: 'SATURDAY LABOUR PAYOUT DUE',
        totalWorkers: data.workersSet.size,
        totalMandays: Math.round(data.totalMandays * 10) / 10,
        totalOTHours: Math.round(data.totalOTHours * 10) / 10,
        regularWages: Math.round(data.regularWages * 100) / 100,
        otWages: Math.round(data.otWages * 100) / 100,
        grossWageLiability: gross,
        bocwCessEstimate: cess,
        customPayload: {
          weekStart,
          weekEnd: asOf,
        },
      })
    })
  } catch (err: any) {
    console.error('[LABOUR PAYOUT SCANNER] Unhandled exception:', err.message)
  }

  return candidates
}
