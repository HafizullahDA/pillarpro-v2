import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Root page: redirects based on session + profile status.
 * All logic is replicated in middleware for edge-level speed;
 * this is a fallback for direct navigation to '/'.
 */
export default async function HomePage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('status')
    .eq('id', user.id)
    .single()

  if (!profile || profile.status === 'pending') {
    redirect('/pending')
  }

  redirect('/dashboard')
}
