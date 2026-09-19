import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DPRClient, DPRItem } from './DPRClient'
import { ProjectDetailHeader } from '../ProjectDetailHeader'
import { canArchiveProject } from '@/lib/permissions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Daily Progress Reports (DPR) | PillarPro',
}

export default async function ProjectDPRPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [
    { data: userRole },
    { data: project },
    { data: reports },
  ] = await Promise.all([
    supabase.rpc('get_user_role'),
    supabase
      .from('projects')
      .select('id, name, agency_name, status, archived, archived_at')
      .eq('id', params.id)
      .single(),
    supabase
      .from('daily_progress_reports')
      .select('id, project_id, report_date, weather, work_completed_notes, impediments_delays, total_manpower_count, masons_count, labourers_count, machinery_active_count, photos, status, created_at')
      .eq('project_id', params.id)
      .order('report_date', { ascending: false }),
  ])

  if (!project) notFound()

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <ProjectDetailHeader
        project={project}
        canArchive={canArchiveProject(userRole)}
      />

      <DPRClient
        project={{
          id: project.id,
          name: project.name,
          agency_name: project.agency_name,
        }}
        reports={(reports as unknown as DPRItem[]) ?? []}
        userRole={(userRole as string) ?? ''}
      />
    </div>
  )
}

