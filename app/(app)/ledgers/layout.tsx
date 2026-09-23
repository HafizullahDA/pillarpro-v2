import { createClient } from '@/lib/supabase/server'
import { LedgerTabsHeader } from '@/components/ledgers/LedgerTabsHeader'

export default async function LedgersLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: userRole } = await supabase.rpc('get_user_role')

  return (
    <div className="min-h-full flex flex-col bg-slate-100">
      <LedgerTabsHeader userRole={(userRole as string) ?? 'owner'} />
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}

