import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/nav/Sidebar'
import { IconRail } from '@/components/nav/IconRail'
import { BottomNav } from '@/components/nav/BottomNav'
import { FAB } from '@/components/nav/FAB'
import { OfflineStatusBanner } from '@/components/ui/OfflineStatusBanner'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: userStatus } = await supabase.rpc('get_user_status')
  if (!userStatus || userStatus !== 'active') redirect('/pending')

  const { data: roleData } = await supabase.rpc('get_user_role')
  const displayName = (user.user_metadata?.display_name as string | undefined) ?? user.email ?? 'User'
  const userRole = (roleData as string | null) ?? 'pending'

  return (
    <div className="flex flex-col min-h-screen bg-slate-100">
      <OfflineStatusBanner />
      <div className="flex-1 flex min-w-0">
        <Sidebar userName={displayName} userRole={userRole} userEmail={user.email} />
        <IconRail userName={displayName} userRole={userRole} userEmail={user.email} />
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 pb-20 md:pb-0">
            {children}
          </main>
        </div>
        <BottomNav />
        <FAB />
      </div>
    </div>
  )
}
