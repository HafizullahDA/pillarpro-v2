/**
 * PUBLIC API ROUTE: /api/log-error
 * Reason: Used by client applications to report runtime exceptions and telemetry,
 * allowing client error captures even when the user's auth session is invalid or expiring.
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { logErrorRequestSchema } from '@/lib/validations/api'
import { RateLimitError, ValidationError, formatErrorResponse } from '@/lib/errors/AppError'

const LOG_RATE_LIMIT = { limit: 20, windowMs: 60 * 1000 }

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const rateCheck = checkRateLimit(`log-error:${ip}`, LOG_RATE_LIMIT)
    if (!rateCheck.success) {
      return formatErrorResponse(
        new RateLimitError('Rate limit exceeded for error reporting.', rateCheck.resetSeconds)
      )
    }

    const rawBody = await request.json().catch(() => ({}))
    const parseResult = logErrorRequestSchema.safeParse(rawBody)
    if (!parseResult.success) {
      return formatErrorResponse(
        new ValidationError('Invalid error payload.', parseResult.error.flatten())
      )
    }

    const payload = parseResult.data

    console.error('[Production Form Error Received]:', {
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
        text: `*PillarPro Error Alert*\n*Context:* ${payload.context}\n*Message:* ${payload.message}\n*URL:* ${payload.url || 'N/A'}\n*Time:* ${payload.timestamp || new Date().toISOString()}\n\`\`\`json\n${JSON.stringify(payload.metadata || {}, null, 2)}\n\`\`\``,
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
  } catch (err: unknown) {
    return formatErrorResponse(err)
  }
}
