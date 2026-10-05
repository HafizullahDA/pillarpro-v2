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

    // Fetch existing preferences
    let { data: preferences, error } = await supabase
      .from('alert_preferences')
      .select('*')
      .eq('organization_id', orgId)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Auto-create default preferences if none exist
    if (!preferences) {
      const { data: created, error: insertError } = await supabase
        .from('alert_preferences')
        .insert({
          organization_id: orgId,
          primary_phone: process.env.WHATSAPP_ALERT_RECIPIENT_PHONE || null,
        })
        .select()
        .single()

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
      preferences = created
    }

    return NextResponse.json({ success: true, preferences })
  } catch (err: any) {
    console.error('[GET ALERT PREFERENCES ERROR]', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
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

    const body = await req.json()
    const {
      primary_phone,
      accounts_phone,
      site_phone,
      bg_fdr_enabled,
      contractual_notices_enabled,
      ra_bills_enabled,
      supplier_credit_enabled,
      dpr_reminders_enabled,
      inventory_reorder_enabled,
      machinery_fleet_enabled,
      labour_payout_enabled,
      threshold_config,
    } = body

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (primary_phone !== undefined) updatePayload.primary_phone = primary_phone?.trim() || null
    if (accounts_phone !== undefined) updatePayload.accounts_phone = accounts_phone?.trim() || null
    if (site_phone !== undefined) updatePayload.site_phone = site_phone?.trim() || null
    if (bg_fdr_enabled !== undefined) updatePayload.bg_fdr_enabled = Boolean(bg_fdr_enabled)
    if (contractual_notices_enabled !== undefined) updatePayload.contractual_notices_enabled = Boolean(contractual_notices_enabled)
    if (ra_bills_enabled !== undefined) updatePayload.ra_bills_enabled = Boolean(ra_bills_enabled)
    if (supplier_credit_enabled !== undefined) updatePayload.supplier_credit_enabled = Boolean(supplier_credit_enabled)
    if (dpr_reminders_enabled !== undefined) updatePayload.dpr_reminders_enabled = Boolean(dpr_reminders_enabled)
    if (inventory_reorder_enabled !== undefined) updatePayload.inventory_reorder_enabled = Boolean(inventory_reorder_enabled)
    if (machinery_fleet_enabled !== undefined) updatePayload.machinery_fleet_enabled = Boolean(machinery_fleet_enabled)
    if (labour_payout_enabled !== undefined) updatePayload.labour_payout_enabled = Boolean(labour_payout_enabled)
    if (threshold_config !== undefined) updatePayload.threshold_config = threshold_config

    const { data: updated, error } = await supabase
      .from('alert_preferences')
      .upsert({
        organization_id: orgId,
        ...updatePayload,
      }, { onConflict: 'organization_id' })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, preferences: updated })
  } catch (err: any) {
    console.error('[POST ALERT PREFERENCES ERROR]', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
