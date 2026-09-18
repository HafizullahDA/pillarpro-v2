/**
 * PUBLIC API ROUTE: /api/auth/rate-limit
 * Reason: Used by unauthenticated visitors during sign-in and sign-up
 * to prevent brute-force attacks and credential stuffing.
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { authRateLimitRequestSchema } from '@/lib/validations/api'
import { ValidationError, formatErrorResponse } from '@/lib/errors/AppError'

// Configurable security thresholds
const AUTH_RATE_LIMITS = {
  'sign-in': {
    limit: 5, // 5 login attempts
    windowMs: 60 * 1000, // per 1 minute
    label: 'sign-in attempts',
  },
  'sign-up': {
    limit: 3, // 3 registrations
    windowMs: 15 * 60 * 1000, // per 15 minutes
    label: 'registration attempts',
  },
} as const

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => ({}))
    const parseResult = authRateLimitRequestSchema.safeParse(rawBody)

    if (!parseResult.success) {
      return formatErrorResponse(
        new ValidationError('Invalid auth rate limit request.', parseResult.error.flatten())
      )
    }

    const { action } = parseResult.data
    const config = AUTH_RATE_LIMITS[action]
    const clientIp = getClientIp(req)

    const key = `auth:${action}:${clientIp}`
    const result = checkRateLimit(key, { limit: config.limit, windowMs: config.windowMs })

    if (!result.success) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          error: `Too many ${config.label} from this IP. For security, please wait ${result.resetSeconds}s before trying again.`,
          resetSeconds: result.resetSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(result.resetSeconds),
            'X-RateLimit-Limit': String(result.limit),
            'X-RateLimit-Remaining': '0',
          },
        }
      )
    }

    return NextResponse.json({
      ok: true,
      success: true,
      remaining: result.remaining,
      limit: result.limit,
    })
  } catch {
    // Fail-open on unhandled network parsing error to avoid permanently locking out legitimate users
    return NextResponse.json({ ok: true, success: true })
  }
}
