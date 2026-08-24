import { createClient } from '@/lib/supabase/server'
import { formatINR, formatDate } from '@/lib/format'
import { EmptyState } from '@/components/ui/EmptyState'
import { PartnersActions } from './PartnersActions'

export default async function PartnersPage() {
  const supabase = createClient()
  const { data: projects } = await supabase.from('projects').select('id, name').order('name')

  const { data: partners } = await supabase
    .from('partners')
    .select('id, name, opening_balance, partner_transactions(transaction_type, amount, date)')
    .order('name')


  const partnersWithBalance = (partners ?? []).map(p => {
    let balance = p.opening_balance ?? 0
    for (const tx of (p.partner_transactions ?? [])) {
      if (tx.transaction_type === 'paid_by_partner') balance += tx.amount ?? 0
      else balance -= tx.amount ?? 0
    }
    const lastTx = (p.partner_transactions ?? []).sort((a: {date:string}, b: {date:string}) => b.date > a.date ? 1 : -1)[0]
    return { ...p, balance, lastDate: lastTx?.date ?? null }
  })

  const { data: recentTx } = await supabase
    .from('partner_transactions')
    .select('*, partners(name), projects(name)')
    .order('date', { ascending: false })
    .limit(20)

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-slate-900">Partners</h1>
        <PartnersActions projects={projects ?? []} partners={partnersWithBalance.map(p => ({ id: p.id, name: p.name }))} />
      </div>

      {!partnersWithBalance.length ? (
        <EmptyState title="No partners yet" description="Add partners to track capital contributions and withdrawals." />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {partnersWithBalance.map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Last: {formatDate(p.lastDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold tabular-nums ${p.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatINR(Math.abs(p.balance))}
                    </p>
                    <p className="text-xs text-slate-400">{p.balance >= 0 ? 'paid in more' : 'received more'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent transactions */}
          <h2 className="text-base font-semibold text-slate-800 mb-3">Recent Transactions</h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Partner</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Purpose</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Project</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(recentTx ?? []).map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{(tx.partners as {name:string}|null)?.name ?? '—'}</p>
                        <p className="text-xs text-slate-400">{tx.transaction_type === 'paid_by_partner' ? 'Paid by partner' : 'Received by partner'}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 capitalize hidden md:table-cell">{tx.purpose?.replace('_', ' ') ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{(tx.projects as {name:string}|null)?.name ?? 'Firm-level'}</td>
                      <td className={`px-4 py-3 text-right tabular-nums font-semibold ${tx.transaction_type === 'paid_by_partner' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatINR(tx.amount)}
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{formatDate(tx.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
