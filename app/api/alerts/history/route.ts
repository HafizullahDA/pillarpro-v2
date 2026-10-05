import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: orgId } = await supabase.rpc('get_user_organization_id')
    if (!orgId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const entityType = searchParams.get('entityType')
    const status = searchParams.get('status')

    let query = supabase
      .from('alert_dispatch_logs')
      .select('id, organization_id, project_id, entity_type, entity_id, entity_reference, milestone_key, channel, recipient_phone, status, error_message, meta_message_id, dispatched_at, payload_snapshot', { count: 'exact' })
      .eq('organization_id', orgId)
      .order('dispatched_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (entityType && entityType !== 'all') {
      query = query.eq('entity_type', entityType)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: logs, count, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      logs: logs || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (err: any) {
    console.error('[GET ALERT HISTORY ERROR]', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
