import { NextRequest, NextResponse } from 'next/server'
import { FormErrorPayload } from '@/lib/monitoring'

export async function POST(request: NextRequest) {
  try {
    const payload: FormErrorPayload = await request.json()

    console.error('🔥 [Production Form Error Received]:', {
      context: payload.context,
      message: payload.message,
      metadata: payload.metadata,
      url: payload.url,
      timestamp: payload.timestamp,
    })

    const webhookUrl = process.env.ERROR_ALERT_WEBHOOK_URL

    if (webhookUrl) {
      // Fire-and-forget alert to external webhook (Slack, Discord, Teams, or Zapier)
      const alertBody = {
        text: `⚠️ *PillarPro Error Alert*\n*Context:* ${payload.context}\n*Message:* ${payload.message}\n*URL:* ${payload.url || 'N/A'}\n*Time:* ${payload.timestamp}\n\`\`\`json\n${JSON.stringify(payload.metadata || {}, null, 2)}\n\`\`\``,
      }

      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertBody),
      }).catch(err => {
        console.warn('Failed to forward error alert to external webhook:', err)
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Error in /api/log-error:', err)
    return NextResponse.json({ error: 'Failed to record error' }, { status: 500 })
  }
}

