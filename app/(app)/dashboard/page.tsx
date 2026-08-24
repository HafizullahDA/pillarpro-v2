import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SummaryTile } from '@/components/ui/SummaryTile'
import { formatINR } from '@/lib/format'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  // Aggregate ledger totals
  const { data: totals } = await supabase.rpc('get_dashboard_totals')

  const t = totals ?? { total_expense: 0, total_received: 0, vendor_dues: 0, outstanding: 0 }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold text-slate-900 mb-5">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <SummaryTile label="Total Expense"  value={formatINR(t.total_expense)}  accent="red"     />
        <SummaryTile label="Total Received" value={formatINR(t.total_received)} accent="emerald" />
        <SummaryTile label="Outstanding"    value={formatINR(t.outstanding)}    accent="amber"   />
        <SummaryTile label="Vendor Dues"    value={formatINR(t.vendor_dues)}    accent="blue"    />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-500">
        <p className="text-sm">Full dashboard with charts and filters coming in Phase 3.</p>
      </div>
    </div>
  )
}
