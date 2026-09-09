/**
 * PillarPro Centralized Error & Telemetry Monitoring
 *
 * Tracks critical form failures (procurements, payments, bills, expenses)
 * and dispatches notifications via server webhook or Sentry if configured.
 */

export interface FormErrorPayload {
  context: string
  message: string
  stack?: string
  metadata?: Record<string, any>
  timestamp: string
  userAgent?: string
  url?: string
}

/**
 * Normalizes any caught error into an error message and optional stack.
 */
export function normalizeError(err: unknown): { message: string; stack?: string } {
  if (err instanceof Error) {
    return { message: err.message, stack: err.stack }
  }
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return { message: String((err as any).message) }
  }
  if (typeof err === 'string') {
    return { message: err }
  }
  return { message: 'An unknown error occurred.' }
}

/**
 * Dispatches an error report to the server-side log endpoint.
 * Non-blocking: will never crash or interrupt the user.
 */
export async function captureFormError(
  context: string,
  error: unknown,
  metadata?: Record<string, any>
): Promise<string> {
  const { message, stack } = normalizeError(error)
  const timestamp = new Date().toISOString()

  console.error(`🚨 [Form Error] [${context}]`, message, { metadata, stack })

  // Forward to Sentry if initialized on window
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    try {
      ;(window as any).Sentry.captureException(error, {
        tags: { form_context: context },
        extra: metadata,
      })
    } catch {
      // Sentry dispatch failure should not block user
    }
  }

  // Forward to server-side webhook dispatcher asynchronously
  if (typeof window !== 'undefined') {
    try {
      fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
          message,
          stack,
          metadata,
          timestamp,
          userAgent: navigator.userAgent,
          url: window.location.href,
        } as FormErrorPayload),
      }).catch(() => {
        // Silent failure for reporting endpoint
      })
    } catch {
      // Ignore network errors in reporting itself
    }
  }

  // Return a user-friendly message
  return message.includes('network') || message.includes('Failed to fetch')
    ? 'Network connection issue. Please check your internet and try again.'
    : message || 'An unexpected error occurred while saving.'
}

