import dynamic from 'next/dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isPlatformAdmin } from '@/lib/platformAdmin'
import { Sidebar } from '@/components/nav/Sidebar'
import { IconRail } from '@/components/nav/IconRail'
import { BottomNav } from '@/components/nav/BottomNav'
import { MobileHeader } from '@/components/nav/MobileHeader'
import { OfflineStatusBanner } from '@/components/ui/OfflineStatusBanner'
import { SubscriptionStatusBanner } from '@/components/subscription/SubscriptionStatusBanner'
import { IdleTimeoutProvider } from '@/components/auth/IdleTimeoutProvider'
import { ToastProvider } from '@/components/ui/Toast'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'
import { getEffectiveSubscription } from '@/lib/subscription'

const GlobalContractCopilot = dynamic(
  () => import('@/components/contract-ai/GlobalContractCopilot').then(mod => mod.GlobalContractCopilot),
  { ssr: false }
)

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const [
    { data: userStatus, error: statusError },
    { data: roleData },
    { data: rawProjects },
    { data: orgData },
    isSuperAdmin,
  ] = await Promise.all([
    supabase.rpc('get_user_status'),
    supabase.rpc('get_user_role'),
    supabase
      .from('projects')
      .select('id, name')
      .eq('archived', false)
      .order('created_at', { ascending: false }),
    supabase.rpc('get_organization_profile'),
    isPlatformAdmin(supabase, user.email),
  ])

  if (!statusError && (!userStatus || userStatus !== 'active')) {
    redirect('/pending')
  }

  const displayName = (user.user_metadata?.display_name as string | undefined) ?? user.email ?? 'User'
  const userRole = (roleData as string | null) ?? 'pending'
  const effectiveSub = getEffectiveSubscription(orgData as any)

  return (
    <IdleTimeoutProvider>
      <ToastProvider>
        <LanguageProvider>
          <div className="flex flex-col min-h-dvh bg-slate-50">
            <OfflineStatusBanner />
            <SubscriptionStatusBanner effectiveSub={effectiveSub} userCreatedAt={user.created_at} />
            <MobileHeader
              userName={displayName}
              userRole={userRole}
              userEmail={user.email}
              isPlatformAdmin={isSuperAdmin}
            />
            <div className="flex-1 flex min-w-0">
              <Sidebar
                userName={displayName}
                userRole={userRole}
                userEmail={user.email}
                isPlatformAdmin={isSuperAdmin}
              />
              <IconRail
                userName={displayName}
                userRole={userRole}
                userEmail={user.email}
                isPlatformAdmin={isSuperAdmin}
              />
              <div className="flex-1 flex flex-col min-w-0">
                <main className="flex-1 min-w-0 overflow-x-hidden pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))] md:pb-24">
                  {children}
                </main>
              </div>
            </div>
            <BottomNav
              userName={displayName}
              userRole={userRole}
              userEmail={user.email}
              isPlatformAdmin={isSuperAdmin}
            />
            <GlobalContractCopilot
              projects={rawProjects ?? []}
              userPlanTier={effectiveSub.planTier}
            />
          </div>
        </LanguageProvider>
      </ToastProvider>
    </IdleTimeoutProvider>
  )
}
