import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { formatINR, formatDate } from '@/lib/format'

const statusVariant = {
  active: 'success', completed: 'neutral', on_hold: 'warning', cancelled: 'danger',
} as const

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!project) notFound()

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{project.name}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{project.agency_name ?? '—'}</p>
        </div>
        <Badge
          label={project.status?.replace('_', ' ') ?? 'active'}
          variant={statusVariant[project.status as keyof typeof statusVariant] ?? 'default'}
        />
      </div>

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

      <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-500 text-sm">
        Per-project Vendors, Attendance, Receivables and Expenses tabs coming in the next build.
      </div>
    </div>
  )
}
