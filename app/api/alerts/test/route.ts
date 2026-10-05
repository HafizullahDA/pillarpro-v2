import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWhatsAppTextMessage } from '@/lib/whatsappCloudApi'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { phone, roleName } = await req.json()

    if (!phone || typeof phone !== 'string' || phone.trim().length < 10) {
      return NextResponse.json(
        { error: 'Valid recipient mobile number (with country code, e.g. +91 9876543210) is required.' },
        { status: 400 }
      )
    }

    const testMessage = [
      `🔔 *PILLARPRO AUTONOMOUS NOTIFICATION ENGINE*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `*System Health Check & Connectivity Verification*`,
      ``,
      `Hello! This is a test verification message dispatched from your PillarPro Alert Control Center.`,
      ``,
      `• *Routing Role:* ${roleName || 'Primary Administrator'}`,
      `• *Recipient:* ${phone.trim()}`,
      `• *Timestamp:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`,
      `• *Channel:* Meta Cloud WhatsApp Official Gateway`,
      `• *Status:* Active & Monitored ✅`,
      ``,
      `Your organization's autonomous alerts for Bank Guarantees, Delayed RA Bills, Supplier Credit Limits, and Daily DPR Reminders will be dispatched to this number.`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `_PillarPro Enterprise Infrastructure • Built for Indian Highway & Civil EPC Contractors_`,
    ].join('\n')

    const result = await sendWhatsAppTextMessage({
      to: phone.trim(),
      text: testMessage,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to dispatch test WhatsApp message' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Test WhatsApp message successfully sent to ${phone.trim()}`,
      messageId: result.messageId,
    })
  } catch (err: any) {
    console.error('[TEST ALERT DISPATCH ERROR]', err)
    return NextResponse.json(
      { error: err.message || 'Internal error dispatching test alert' },
      { status: 500 }
    )
  }
}
