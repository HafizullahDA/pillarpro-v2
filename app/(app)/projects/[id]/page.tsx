import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatINR, formatDate } from '@/lib/format'
import { canArchiveProject } from '@/lib/permissions'
import { ProjectDetailHeader } from './ProjectDetailHeader'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const [{ data: userRole }, { data: project }] = await Promise.all([
    supabase.rpc('get_user_role'),
    supabase
      .from('projects')
      .select('id, name, agency_name, advertised_cost, awarded_amount, start_date, end_date, status, archived, archived_at, created_at')
      .eq('id', params.id)
      .single(),
  ])

  if (!project) notFound()

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <ProjectDetailHeader
        project={project}
        canArchive={canArchiveProject(userRole)}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Advertised Cost</p>
          <p className="text-base font-bold text-slate-900 tabular-nums">{formatINR(project.advertised_cost)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Awarded Amount</p>
          <p className="text-base font-bold text-slate-900 tabular-nums">{formatINR(project.awarded_amount)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Start Date</p>
          <p className="text-base font-semibold text-slate-900">{formatDate(project.start_date)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">End Date</p>
          <p className="text-base font-semibold text-slate-900">{formatDate(project.end_date)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Daily Progress Reports (DPR) & Site Photo Diary</h3>
          <p className="text-xs text-slate-500 mt-1">
            Track daily site logs, weather conditions, active manpower, and field photographs.
          </p>
        </div>
        <a
          href={`/projects/${project.id}/dpr`}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Open DPR & Photo Diary
        </a>
      </div>
    </div>
  )
}
