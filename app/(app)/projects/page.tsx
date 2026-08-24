import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatINR, formatDate } from '@/lib/format'
import { AddProjectButton } from './AddProjectButton'

const statusVariant = {
  active:    'success',
  completed: 'neutral',
  on_hold:   'warning',
  cancelled: 'danger',
} as const

export default async function ProjectsPage() {
  const supabase = createClient()
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-slate-900">Projects</h1>
        <AddProjectButton />
      </div>

      {!projects?.length ? (
        <EmptyState
          title="No projects yet"
          description="Add your first project to start tracking expenses, attendance, and receivables."
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Project</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Agency</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Awarded</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Start</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/projects/${p.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{p.agency_name ?? '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700 hidden lg:table-cell">{formatINR(p.awarded_amount)}</td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{formatDate(p.start_date)}</td>
                    <td className="px-4 py-3">
                      <Badge
                        label={p.status?.replace('_', ' ') ?? 'active'}
                        variant={statusVariant[p.status as keyof typeof statusVariant] ?? 'default'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
