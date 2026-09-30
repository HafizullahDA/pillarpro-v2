import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'You must be logged in to load sample data.' }, { status: 401 })
    }

    // Fetch user profile and firm name
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id, display_name, organizations(name)')
      .eq('id', user.id)
      .maybeSingle()

    const orgName = (profile?.organizations as { name?: string } | null)?.name || 'My Contracting Firm'
    const displayName = profile?.display_name || user.email?.split('@')[0]

    // Invoke onboard_contractor RPC with p_seed_starter = true
    const { data, error: rpcError } = await supabase.rpc('onboard_contractor', {
      p_firm_name: orgName,
      p_display_name: displayName,
      p_seed_starter: true,
    })

    if (rpcError) {
      console.error('Failed to seed starter project via RPC:', rpcError)
      return NextResponse.json({ error: rpcError.message || 'Failed to seed sample project' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Sample Highway Project & RA Bill loaded successfully',
      data,
    })
  } catch (err) {
    console.error('Exception while seeding starter project:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected server error' },
      { status: 500 }
    )
  }
}

