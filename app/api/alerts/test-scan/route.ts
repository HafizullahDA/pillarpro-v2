import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scanSecurities } from '@/lib/alerts/scanners/securitiesScanner'
import { scanNotices } from '@/lib/alerts/scanners/noticesScanner'
import { scanRABills } from '@/lib/alerts/scanners/raBillsScanner'
import { scanSuppliers } from '@/lib/alerts/scanners/suppliersScanner'
import { runDailyMorningScan } from '@/lib/alerts/dispatchEngine'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Allow in development or for authenticated users
    if (!user && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const asOfDate = req.nextUrl.searchParams.get('asOfDate') || undefined
    const dryRun = req.nextUrl.searchParams.get('dryRun') !== 'false' // defaults to true for safety
    const phone = req.nextUrl.searchParams.get('phone') || undefined

    const [securities, notices, raBills, suppliers] = await Promise.all([
      scanSecurities(supabase, asOfDate),
      scanNotices(supabase, asOfDate),
      scanRABills(supabase, asOfDate),
      scanSuppliers(supabase, asOfDate),
    ])

    const scanSummary = await runDailyMorningScan(supabase, {
      dryRun,
      asOfDateStr: asOfDate,
      overrideRecipientPhone: phone,
    })

    return NextResponse.json({
      success: true,
      dryRun,
      asOfDate: asOfDate || new Date().toISOString().split('T')[0],
      totalFound: securities.length + notices.length + raBills.length + suppliers.length,
      securitiesFound: securities,
      noticesFound: notices,
      raBillsFound: raBills,
      suppliersFound: suppliers,
      executionSummary: scanSummary,
    })
  } catch (err: any) {
    console.error('[TEST SCAN ERROR]', err)
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Error executing test scan',
      },
      { status: 500 }
    )
  }
}
