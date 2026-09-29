import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchReportData } from '@/lib/reports/reportGenerators'
import { ReportFilterParams, ReportKey, REPORT_REGISTRY } from '@/lib/reports/types'
import { normalizeRole } from '@/lib/permissions'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { data: userRole } = await supabase.rpc('get_user_role')
    const canonicalRole = normalizeRole(userRole)

    // Fetch user profile for metadata
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('display_name, email')
      .eq('id', user.id)
      .maybeSingle()

    const userProfile = {
      display_name: profile?.display_name || user.email?.split('@')[0] || 'Staff Member',
      email: user.email,
      role: canonicalRole || 'viewer',
    }

    const body = await req.json()
    const reportKey = (body.reportKey || 'MEASUREMENT_BOOK') as ReportKey

    if (!REPORT_REGISTRY[reportKey]) {
      return NextResponse.json({ error: `Invalid reportKey: ${reportKey}` }, { status: 400 })
    }

    const params: ReportFilterParams = {
      reportKey,
      projectId: body.projectId || undefined,
      startDate: body.startDate || undefined,
      endDate: body.endDate || undefined,
      status: body.status || undefined,
    }

    const report = await fetchReportData(supabase, params, userProfile)
    return NextResponse.json({ success: true, report })
  } catch (err: any) {
    console.error('[REPORT GENERATION ERROR]', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to generate construction report' },
      { status: 500 }
    )
  }
}
