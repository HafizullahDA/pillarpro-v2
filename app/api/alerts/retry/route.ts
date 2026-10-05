import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWhatsAppTextMessage } from '@/lib/whatsappCloudApi'
import { recordDispatchLog } from '@/lib/alerts/ledger'

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

    const { logId } = await req.json()
    if (!logId) {
      return NextResponse.json({ error: 'logId is required' }, { status: 400 })
    }

    const { data: log, error: logError } = await supabase
      .from('alert_dispatch_logs')
      .select('*')
      .eq('id', logId)
      .single()

    if (logError || !log) {
      return NextResponse.json({ error: 'Alert log not found' }, { status: 404 })
    }

    if (!log.recipient_phone) {
      return NextResponse.json({ error: 'No recipient phone on log' }, { status: 400 })
    }

    // Compose re-dispatch message
    const retryText = [
      `🔔 *PILLARPRO NOTIFICATION RETRY: ${log.entity_type.toUpperCase().replace('_', ' ')}*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `*Reference:* ${log.entity_reference || log.entity_id}`,
      `*Milestone:* ${log.milestone_key}`,
      `*Original Dispatched:* ${new Date(log.dispatched_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
      ``,
      `This is a manual re-dispatch triggered from your Alert Control Center.`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `_PillarPro Enterprise Alerts_`,
    ].join('\n')

    const result = await sendWhatsAppTextMessage({
      to: log.recipient_phone,
      text: retryText,
    })

    // Record new log entry for the retry
    await recordDispatchLog(supabase, {
      organization_id: log.organization_id,
      project_id: log.project_id,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      entity_reference: `${log.entity_reference || log.entity_id} (RETRY)`,
      milestone_key: (log.milestone_key || 'T_0') as any,
      channel: 'whatsapp',
      recipient_phone: log.recipient_phone,
      status: result.success ? 'dispatched' : 'failed',
      error_message: result.error || null,
      meta_message_id: result.messageId || null,
      payload_snapshot: log.payload_snapshot,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Retry delivery failed' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Alert re-dispatched to ${log.recipient_phone}`,
      messageId: result.messageId,
    })
  } catch (err: any) {
    console.error('[ALERT RETRY ERROR]', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
