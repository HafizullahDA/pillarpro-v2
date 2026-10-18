import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isPlatformAdmin } from '@/lib/platformAdmin'
import { scanSecurities } from '@/lib/alerts/scanners/securitiesScanner'
import { scanNotices } from '@/lib/alerts/scanners/noticesScanner'
import { scanRABills } from '@/lib/alerts/scanners/raBillsScanner'
import { scanSuppliers } from '@/lib/alerts/scanners/suppliersScanner'
import { scanInventory } from '@/lib/alerts/scanners/inventoryScanner'
import { scanMachinery } from '@/lib/alerts/scanners/machineryScanner'
import { scanMissingDPRs } from '@/lib/alerts/scanners/dprScanner'
import { scanWeeklyLabourPayout } from '@/lib/alerts/scanners/labourPayoutScanner'
import { runFullScan } from '@/lib/alerts/dispatchEngine'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required.' },
        { status: 401 }
      )
    }

    const [isSuperAdmin, { data: userRole }] = await Promise.all([
      isPlatformAdmin(supabase, user.email),
      supabase.rpc('get_user_role'),
    ])

    const isOwner = typeof userRole === 'string' && (userRole.toLowerCase() === 'owner' || userRole.toLowerCase() === 'admin')
    if (!isSuperAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'Forbidden: Platform admin or organization owner privileges required.' },
        { status: 403 }
      )
    }

    const asOfDate = req.nextUrl.searchParams.get('asOfDate') || undefined
    const dryRun = req.nextUrl.searchParams.get('dryRun') !== 'false' // defaults to true for safety
    const phone = req.nextUrl.searchParams.get('phone') || undefined

    const [
      securities,
      notices,
      raBills,
      suppliers,
      inventory,
      machinery,
      missingDprs,
      labourPayouts,
    ] = await Promise.all([
      scanSecurities(supabase, asOfDate),
      scanNotices(supabase, asOfDate),
      scanRABills(supabase, asOfDate),
      scanSuppliers(supabase, asOfDate),
      scanInventory(supabase, asOfDate),
      scanMachinery(supabase, asOfDate),
      scanMissingDPRs(supabase, asOfDate),
      scanWeeklyLabourPayout(supabase, asOfDate),
    ])

    const totalFound =
      securities.length +
      notices.length +
      raBills.length +
      suppliers.length +
      inventory.length +
      machinery.length +
      missingDprs.length +
      labourPayouts.length

    const scanSummary = await runFullScan(supabase, {
      dryRun,
      asOfDateStr: asOfDate,
      overrideRecipientPhone: phone,
    })

    return NextResponse.json({
      success: true,
      dryRun,
      asOfDate: asOfDate || new Date().toISOString().split('T')[0],
      totalFound,
      securitiesFound: securities,
      noticesFound: notices,
      raBillsFound: raBills,
      suppliersFound: suppliers,
      inventoryFound: inventory,
      machineryFound: machinery,
      missingDprsFound: missingDprs,
      labourPayoutsFound: labourPayouts,
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
