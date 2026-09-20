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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Bill of Quantities (BOQ) & e-MB */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">Bill of Quantities (BOQ) & e-MB</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                Measurement Book
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Schedule of rates, item-wise quantities, real-time physical work-done %, and automated measurement linkage to RA bills.
            </p>
          </div>
          <div className="pt-4">
            <a
              href={`/projects/${project.id}/boq`}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Open BOQ & Measurement Book
            </a>
          </div>
        </div>

        {/* Daily Progress Reports (DPR) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">Daily Progress Reports (DPR)</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                Site Diary
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Track daily site logs, weather conditions, active manpower, machinery fuel consumption, and field photographs.
            </p>
          </div>
          <div className="pt-4">
            <a
              href={`/projects/${project.id}/dpr`}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Open DPR & Photo Diary
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
