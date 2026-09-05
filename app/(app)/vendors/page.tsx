import { createClient } from '@/lib/supabase/server'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatINR } from '@/lib/format'
import { VendorActions } from './VendorActions'

export default async function VendorsPage() {
  const supabase = createClient()

  const { data: projects } = await supabase.from('projects').select('id, name').eq('archived', false).order('name')

  // Vendors with computed due = sum(purchases) - sum(payments)
  const { data: vendors } = await supabase
    .from('vendors')
    .select(`
      id, name, contact_person, phone, project_id,
      projects(name),
      vendor_purchases(amount),
      vendor_payments(amount)
    `)
    .order('name')

  const vendorsWithDue = (vendors ?? []).map(v => {
    const totalPurchased = (v.vendor_purchases ?? []).reduce((s: number, p: {amount: number}) => s + (p.amount ?? 0), 0)
    const totalPaid = (v.vendor_payments ?? []).reduce((s: number, p: {amount: number}) => s + (p.amount ?? 0), 0)
    return { ...v, due: totalPurchased - totalPaid }
  })

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-slate-900">Vendors</h1>
        <VendorActions projects={projects ?? []} />
      </div>

      {!vendorsWithDue.length ? (
        <EmptyState title="No vendors yet" description="Add vendors to track purchases and payments against each project." />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Vendor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Project</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Phone</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendorsWithDue.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{v.name}</td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{(v.projects as {name:string}[] | null)?.[0]?.name ?? '—'}</td>

                    <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{v.contact_person ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{v.phone ?? '—'}</td>
                    <td className={`px-4 py-3 text-right tabular-nums font-semibold ${v.due > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {formatINR(v.due)}
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
