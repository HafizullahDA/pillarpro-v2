import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runDailyEveningScan } from '@/lib/alerts/dispatchEngine'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60s for batch scanner processing

export async function GET(req: NextRequest) {
  try {
    // 1. Validate authorization
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    const urlKey = req.nextUrl.searchParams.get('key')

    const isAuthorized =
      !cronSecret || // If no secret set yet in local dev, allow
      process.env.NODE_ENV !== 'production' ||
      (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
      (cronSecret && urlKey === cronSecret)

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized cron trigger' }, { status: 401 })
    }

    // 2. Parse optional query parameters for testing/dry-run
    const isDryRun = req.nextUrl.searchParams.get('dryRun') === 'true'
    const asOfDateStr = req.nextUrl.searchParams.get('asOfDate') || undefined
    const overridePhone = req.nextUrl.searchParams.get('phone') || undefined

    const supabase = createClient()

    const summary = await runDailyEveningScan(supabase, {
      dryRun: isDryRun,
      asOfDateStr,
      overrideRecipientPhone: overridePhone,
    })

    return NextResponse.json({
      success: true,
      message: 'Autonomous daily evening scan (8:00 PM DPR check) completed successfully.',
      summary,
    })
  } catch (err: any) {
    console.error('[CRON EVENING ALERTS ERROR]', err)
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Internal error executing evening scan',
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  return GET(req)
}
