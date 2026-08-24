import { createClient } from '@/lib/supabase/server'
import { formatINR, formatDate } from '@/lib/format'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ReceivablesActions } from './ReceivablesActions'

const BILL_TYPE_VARIANTS = {
  'RA Bill': 'default', 'Final Bill': 'success',
  'Advance': 'warning', 'Mobilization Bill': 'info',
} as const

export default async function ReceivablesPage() {
  const supabase = createClient()
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, agency_name, advertised_cost, awarded_amount')
    .order('name')

  const { data: bills } = await supabase
    .from('bills')
    .select('*, projects(name), receivable_payments(amount_received)')
    .order('bill_date', { ascending: false })

  const now = new Date().getTime()

  const billsWithStatus = (bills ?? []).map(b => {
    const received = (b.receivable_payments ?? []).reduce((s: number, p: {amount_received: number}) => s + (p.amount_received ?? 0), 0)
    const net = (b.gross_amount ?? 0) - (b.deductions ?? 0)
    const outstanding = net - received

    // Calculate aging in days
    const billAgeDays = Math.floor((now - new Date(b.bill_date).getTime()) / (1000 * 60 * 60 * 24))
    let agingBand: '0-30d' | '31-60d' | '60d+' = '0-30d'
    if (billAgeDays > 60) agingBand = '60d+'
    else if (billAgeDays > 30) agingBand = '31-60d'

    return { ...b, net, received, outstanding, agingBand, billAgeDays }
  })

  // Aggregate project summary
  const projectSummaries = (projects ?? []).map(p => {
    const projBills = billsWithStatus.filter(b => b.project_id === p.id)
    const totalBilled = projBills.reduce((sum, b) => sum + b.net, 0)
    const totalReceived = projBills.reduce((sum, b) => sum + b.received, 0)
    const totalOutstanding = totalBilled - totalReceived
    return {
      ...p,
      totalBilled,
      totalReceived,
      totalOutstanding,
    }
  })

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Receivables</h1>
        <ReceivablesActions
          projects={projects ?? []}
          bills={billsWithStatus.map(b => ({ id: b.id, label: `${b.bill_number} — ${(b.projects as {name:string}|null)?.name ?? ''}` }))}
        />
      </div>

      {/* Per-Project Summary Table */}
      {projectSummaries.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 font-semibold text-xs text-slate-500 uppercase tracking-wide">
            Project Summary Overview
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 text-xs">
                  <th className="text-left px-4 py-2.5 font-semibold">Project</th>
                  <th className="text-left px-4 py-2.5 font-semibold hidden md:table-cell">Agency</th>
                  <th className="text-right px-4 py-2.5 font-semibold hidden lg:table-cell">Awarded</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Total Billed</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Received</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projectSummaries.map(ps => (
                  <tr key={ps.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{ps.name}</td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{ps.agency_name ?? '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600 hidden lg:table-cell">{formatINR(ps.awarded_amount)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700 font-medium">{formatINR(ps.totalBilled)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-emerald-600">{formatINR(ps.totalReceived)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums font-semibold ${ps.totalOutstanding > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {formatINR(ps.totalOutstanding)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bills & Payments Table */}
      {!billsWithStatus.length ? (
        <EmptyState title="No bills yet" description="Add your first bill to start tracking receivables from government agencies." />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 font-semibold text-xs text-slate-500 uppercase tracking-wide">
            Bills Ledger & Aging Status
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Bill</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Project</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Type</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Aging</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Net</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Received</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {billsWithStatus.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{b.bill_number}</p>
                      <p className="text-xs text-slate-400">{formatDate(b.bill_date)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{(b.projects as {name:string}|null)?.name ?? '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <Badge label={b.bill_type ?? 'RA Bill'} variant={BILL_TYPE_VARIANTS[b.bill_type as keyof typeof BILL_TYPE_VARIANTS] ?? 'default'} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {b.outstanding > 0 ? (
                        <Badge
                          label={b.agingBand}
                          variant={b.agingBand === '60d+' ? 'danger' : b.agingBand === '31-60d' ? 'warning' : 'neutral'}
                        />
                      ) : (
                        <Badge label="Paid" variant="success" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{formatINR(b.net)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-emerald-600">{formatINR(b.received)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums font-semibold ${b.outstanding > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {formatINR(b.outstanding)}
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
