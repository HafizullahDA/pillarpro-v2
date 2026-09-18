/**
 * PUBLIC API ROUTE: /api/health
 * Reason: Synthetic uptime monitoring endpoint (BetterUptime, Datadog, UptimeRobot)
 * which must run unauthenticated to verify platform connectivity and latency.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTimestampIST } from '@/lib/date'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startTime = Date.now()

  try {
    const supabase = createClient()

    // Lightweight query against organizations table to verify database connection
    const { error } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)

    const latencyMs = Date.now() - startTime

    if (error) {
      console.error('🚨 [Health Check Failed]: Database error:', error.message)
      const isDev = process.env.NODE_ENV === 'development'
      return NextResponse.json(
        {
          status: 'unhealthy',
          database: 'disconnected',
          error: isDev ? error.message : 'Database connectivity check failed',
          latencyMs,
          timestamp: new Date().toISOString(),
          timestampIST: getTimestampIST(),
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      {
        status: 'healthy',
        database: 'connected',
        latencyMs,
        timestamp: new Date().toISOString(),
        timestampIST: getTimestampIST(),
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    )
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime
    console.error('🚨 [Health Check Exception]:', err)

    const isDev = process.env.NODE_ENV === 'development'
    const safeError = isDev && err instanceof Error ? err.message : 'Health check exception occurred'

    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'error',
        error: safeError,
        latencyMs,
        timestamp: new Date().toISOString(),
        timestampIST: getTimestampIST(),
      },
      { status: 503 }
    )
  }
}
