/**
 * Heavy Plant & Machinery Fleet Scanner (Phase 3)
 * Scans machinery assets for preventive service intervals (250h/500h) and
 * statutory compliance document expiry (Commercial Insurance, Fitness, PUC).
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { AlertCandidate } from '../types'
import { evaluateMilestone } from '../milestoneEvaluator'

export async function scanMachinery(
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

    if (!rpcError && rpcData && Array.isArray(rpcData.machinery)) {
      for (const asset of rpcData.machinery) {
        processMachineryAsset(asset, asOf, candidates)
      }
      return candidates
    }
  } catch (err) {
    // Fall back to direct query
  }

  // 2. Direct query fallback
  try {
    const { data: assets, error: mchError } = await supabase
      .from('machinery_assets')
      .select('id, organization_id, project_id, asset_name, asset_type, registration_number, current_meter, last_service_meter, service_interval_meter, insurance_expiry, fitness_expiry, puc_expiry, status, projects(name)')
      .eq('status', 'active')

    if (mchError) {
      console.warn('[MACHINERY SCANNER] Error querying machinery_assets:', mchError.message)
      return candidates
    }

    if (!assets || assets.length === 0) {
      return candidates
    }

    for (const asset of assets as any[]) {
      const flattened = {
        ...asset,
        project_name: asset.projects?.name,
      }
      processMachineryAsset(flattened, asOf, candidates)
    }
  } catch (err: any) {
    console.error('[MACHINERY SCANNER] Unhandled exception:', err.message)
  }

  return candidates
}

function processMachineryAsset(
  asset: any,
  asOf: string,
  candidates: AlertCandidate[]
) {
  const curMeter = Number(asset.current_meter || 0)
  const lastMeter = Number(asset.last_service_meter || 0)
  const interval = Number(asset.service_interval_meter || 250)
  const hoursSince = Math.max(0, curMeter - lastMeter)

  // A. Preventive Service Interval Check
  if (interval > 0 && hoursSince >= interval) {
    const serviceCycle = Math.floor(curMeter / interval)
    candidates.push({
      entityType: 'machinery',
      entityId: `${asset.id}_service_${serviceCycle}`,
      entityReference: `${asset.asset_name} (${asset.registration_number || 'Fleet'})`,
      organizationId: asset.organization_id,
      projectId: asset.project_id,
      projectName: asset.project_name,
      targetDate: asOf,
      daysRemaining: 0,
      milestoneKey: 'SERVICE_DUE',
      urgencyLabel: `PREVENTIVE SERVICE DUE (${hoursSince}h / ${interval}h)`,
      assetName: asset.asset_name,
      registrationNumber: asset.registration_number,
      currentMeter: curMeter,
      lastServiceMeter: lastMeter,
      serviceIntervalMeter: interval,
      hoursSinceLastService: hoursSince,
      complianceDocType: 'service',
    })
  }

  // B. Statutory Document Expiries (Insurance, Fitness, PUC)
  const complianceDocs: Array<{
    type: 'insurance' | 'fitness' | 'puc'
    dateStr: string | null
    label: string
  }> = [
    { type: 'insurance', dateStr: asset.insurance_expiry, label: 'Insurance' },
    { type: 'fitness', dateStr: asset.fitness_expiry, label: 'Fitness Certificate' },
    { type: 'puc', dateStr: asset.puc_expiry, label: 'PUC Certificate' },
  ]

  for (const doc of complianceDocs) {
    if (doc.dateStr) {
      const evaluation = evaluateMilestone(doc.dateStr, asOf)
      if (evaluation.milestoneKey) {
        candidates.push({
          entityType: 'machinery',
          entityId: `${asset.id}_${doc.type}`,
          entityReference: `${asset.asset_name} - ${doc.label}`,
          organizationId: asset.organization_id,
          projectId: asset.project_id,
          projectName: asset.project_name,
          targetDate: doc.dateStr,
          daysRemaining: evaluation.daysRemaining,
          milestoneKey: evaluation.milestoneKey,
          urgencyLabel: `${doc.label.toUpperCase()} ${evaluation.urgencyLabel}`,
          assetName: asset.asset_name,
          registrationNumber: asset.registration_number,
          currentMeter: curMeter,
          complianceDocType: doc.type,
        })
      }
    }
  }
}
