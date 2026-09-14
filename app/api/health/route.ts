import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTimestampIST } from '@/lib/date'

export const dynamic = 'force-dynamic'

/**
 * Health check endpoint for synthetic uptime monitoring (BetterUptime, UptimeRobot, Datadog).
 * Pings Supabase to verify live database connectivity and measures round-trip latency.
 */
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
      return NextResponse.json(
        {
          status: 'unhealthy',
          database: 'disconnected',
          error: error.message,
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
  } catch (err: any) {
    const latencyMs = Date.now() - startTime
    console.error('🚨 [Health Check Exception]:', err)

    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'error',
        error: err?.message || 'Unknown health check failure',
        latencyMs,
        timestamp: new Date().toISOString(),
        timestampIST: getTimestampIST(),
      },
      { status: 503 }
    )
  }
}

