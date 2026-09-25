import { createClient } from '@/lib/supabase/server'
import { isPlatformAdmin, DEFAULT_PLATFORM_ADMINS } from '@/lib/platformAdmin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const callerIsAdmin = await isPlatformAdmin(supabase, user.email)
    if (!callerIsAdmin) {
      return NextResponse.json({ error: 'Forbidden: Platform owner access required' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const emailToGrant = body.email ? String(body.email).trim().toLowerCase() : ''

    if (!emailToGrant || !emailToGrant.includes('@')) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    const { error: insertError } = await supabase
      .from('platform_admins')
      .insert({
        email: emailToGrant,
        granted_by: user.email,
        created_at: new Date().toISOString(),
      })

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'This user already has platform admin access.' }, { status: 400 })
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: `Access granted to ${emailToGrant}` })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const callerIsAdmin = await isPlatformAdmin(supabase, user.email)
    if (!callerIsAdmin) {
      return NextResponse.json({ error: 'Forbidden: Platform owner access required' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const emailToRevoke = body.email ? String(body.email).trim().toLowerCase() : ''

    if (!emailToRevoke) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 })
    }

    if (DEFAULT_PLATFORM_ADMINS.includes(emailToRevoke)) {
      return NextResponse.json({ error: 'Cannot revoke root platform owner access.' }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('platform_admins')
      .delete()
      .eq('email', emailToRevoke)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: `Access revoked for ${emailToRevoke}` })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
