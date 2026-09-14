import { createClient } from '@/lib/supabase/server'
import { LandingPage } from '@/components/landing/LandingPage'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function HomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isLoggedIn = false
  let userName: string | null = null
  let orgName: string | null = null

  if (user) {
    const { data: userStatus } = await supabase.rpc('get_user_status')
    if (userStatus === 'active') {
      isLoggedIn = true
      userName = (user.user_metadata?.display_name as string | undefined) ?? user.email?.split('@')[0] ?? null

      const { data: orgProfile } = await supabase.rpc('get_organization_profile')
      orgName = (orgProfile as any)?.name ?? null
    }
  }

  return (
    <LandingPage
      isLoggedIn={isLoggedIn}
      userName={userName}
      orgName={orgName}
    />
  )
}
