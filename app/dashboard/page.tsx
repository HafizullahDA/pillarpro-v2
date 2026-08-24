import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EditNameWidget from './EditNameWidget'


/**
 * Dashboard — Phase 2 placeholder.
 * Guards against unauthenticated access; actual content built in Phase 2.
 */
export default async function DashboardPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/sign-in')

  // Use SECURITY DEFINER RPC to bypass RLS for status check
  const { data: userStatus } = await supabase.rpc('get_user_status')
  if (!userStatus || userStatus !== 'active') redirect('/pending')

  const displayName = (user.user_metadata?.display_name as string | undefined) ?? user.email ?? ''

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <span className="text-white font-bold text-sm">P</span>
        </div>
        <span className="text-lg font-bold text-gray-900">PillarPro</span>
      </header>

      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {displayName}!
        </h1>
        <EditNameWidget currentName={displayName} />
        <p className="mt-4 text-gray-500">
          Dashboard — Phase 2 coming next.
        </p>
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 text-left">
          <strong>Phase 1 complete:</strong>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>Auth (sign-up / sign-in / pending flow)</li>
            <li>Full Postgres schema (17 tables + ledger triggers)</li>
            <li>RLS policies for Owner / Managing Partner / Site Supervisor</li>
          </ul>
        </div>
      </div>
    </main>
  )
}
