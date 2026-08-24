import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: userStatus } = await supabase.rpc('get_user_status')
  if (!userStatus || userStatus !== 'active') redirect('/pending')

  redirect('/dashboard')
}
