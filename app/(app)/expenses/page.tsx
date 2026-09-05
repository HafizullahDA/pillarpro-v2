import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatINR, formatDate } from '@/lib/format'
import { AddExpenseButton } from './AddExpenseButton'

const CATEGORY_VARIANTS: Record<string, 'default'|'success'|'warning'|'danger'|'info'|'neutral'> = {
  labor:      'info',
  material:   'default',
  equipment:  'neutral',
  transport:  'warning',
  fuel:       'warning',
  admin:      'neutral',
  tendering:  'info',
  other:      'neutral',
}

export default async function ExpensesPage() {
  const supabase = createClient()
  const [{ data: projects }, { data: suppliers }, { data: expenses }] = await Promise.all([
    supabase.from('projects').select('id, name').order('name'),
    supabase.from('suppliers').select('id, name').order('name'),
    supabase
      .from('expenses')
      .select('*, projects(name)')
      .order('date', { ascending: false })
      .limit(100),
  ])

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-slate-900">Expenses</h1>
        <AddExpenseButton projects={projects ?? []} suppliers={suppliers ?? []} />
      </div>

      {!expenses?.length ? (
        <EmptyState title="No expenses yet" description="Add fuel, equipment, tendering, and other site expenses here." />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Project</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Mode</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{e.description ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{(e.projects as {name:string}|null)?.name ?? '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <Badge label={e.category ?? 'other'} variant={CATEGORY_VARIANTS[e.category ?? 'other'] ?? 'neutral'} />
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{e.payment_mode ?? '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900">{formatINR(e.amount)}</td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{formatDate(e.date)}</td>
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
