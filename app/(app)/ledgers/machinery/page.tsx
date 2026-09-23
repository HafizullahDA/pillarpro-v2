import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { MachineryClient, MachineryAsset, MachineryLog } from '@/app/(app)/machinery/MachineryClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Machinery & Diesel Logbook | Project Ledgers | PillarPro',
}

export default async function MachineryLedgerPage() {
  const supabase = createClient()

  const [
    { data: userRole },
    { data: projects },
    { data: assets },
    { data: logs },
  ] = await Promise.all([
    supabase.rpc('get_user_role'),
    supabase.from('projects').select('id, name').eq('archived', false).order('name'),
    supabase
      .from('machinery_assets')
      .select('id, asset_name, asset_type, registration_number, model_year, ownership, meter_tracking, hourly_rate, current_meter, status, notes, project_id, projects(name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('machinery_logs')
      .select('id, asset_id, project_id, log_date, operator_name, start_meter, end_meter, total_run, work_description, diesel_liters, diesel_rate_per_liter, diesel_cost, fuel_vendor, machinery_assets(asset_name, registration_number, meter_tracking), projects(name)')
      .order('log_date', { ascending: false })
      .limit(150),
  ])

  return (
    <MachineryClient
      initialAssets={(assets as unknown as MachineryAsset[]) ?? []}
      initialLogs={(logs as unknown as MachineryLog[]) ?? []}
      projects={projects ?? []}
      userRole={(userRole as string) ?? ''}
    />
  )
}

