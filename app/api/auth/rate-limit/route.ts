import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

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

type AuthAction = keyof typeof AUTH_RATE_LIMITS

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const action = (body.action || 'sign-in') as AuthAction

    const config = AUTH_RATE_LIMITS[action] || AUTH_RATE_LIMITS['sign-in']
    const clientIp = getClientIp(req)

    const key = `auth:${action}:${clientIp}`
    const result = checkRateLimit(key, { limit: config.limit, windowMs: config.windowMs })

    if (!result.success) {
      return NextResponse.json(
        {
          ok: false,
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
      remaining: result.remaining,
      limit: result.limit,
    })
  } catch {
    // Fail-open on unhandled network parsing error to avoid permanently locking out legitimate users
    return NextResponse.json({ ok: true })
  }
}

