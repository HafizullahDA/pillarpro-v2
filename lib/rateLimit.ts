import { NextRequest } from 'next/server'

interface RateLimitConfig {
  limit: number      // Max requests allowed within the window
  windowMs: number   // Window size in milliseconds
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetSeconds: number
}

// In-memory sliding-window store
const rateLimitStore = new Map<string, number[]>()

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanupOldEntries() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now

  rateLimitStore.forEach((timestamps, key) => {
    // Remove if all timestamps are older than 10 minutes
    const validTimestamps = timestamps.filter(t => now - t < 10 * 60 * 1000)
    if (validTimestamps.length === 0) {
      rateLimitStore.delete(key)
    } else {
      rateLimitStore.set(key, validTimestamps)
    }
  })
}

/**
 * Check if an action by an identifier (user ID or IP) exceeds the rate limit.
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { limit: 10, windowMs: 60 * 1000 }
): RateLimitResult {
  cleanupOldEntries()

  const now = Date.now()
  const windowStart = now - config.windowMs

  const timestamps = rateLimitStore.get(identifier) || []
  // Filter out timestamps outside the active window
  const activeTimestamps = timestamps.filter(t => t > windowStart)

  if (activeTimestamps.length >= config.limit) {
    const oldest = activeTimestamps[0]
    const resetMs = oldest + config.windowMs - now
    const resetSeconds = Math.max(1, Math.ceil(resetMs / 1000))

    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      resetSeconds,
    }
  }

  // Record this hit
  activeTimestamps.push(now)
  rateLimitStore.set(identifier, activeTimestamps)

  const remaining = Math.max(0, config.limit - activeTimestamps.length)
  const resetSeconds = Math.ceil(config.windowMs / 1000)

  return {
    success: true,
    limit: config.limit,
    remaining,
    resetSeconds,
  }
}

/**
 * Extract client IP address from request headers.
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return req.headers.get('x-real-ip') || '127.0.0.1'
}

