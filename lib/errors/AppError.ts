import { NextResponse } from 'next/server'

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMIT_EXCEEDED'
  | 'PAYLOAD_TOO_LARGE'
  | 'CONFLICT'
  | 'INTERNAL_SERVER_ERROR'

export interface StructuredErrorResponse {
  success: false
  error: string
  errorDetail: {
    code: ErrorCode
    message: string
    details?: unknown
  }
}

/**
 * Base Application Error class.
 * All domain, validation, and operational errors should extend AppError.
 */
export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: ErrorCode
  public readonly isOperational: boolean
  public readonly details?: unknown

  constructor(
    message: string,
    statusCode = 500,
    code: ErrorCode = 'INTERNAL_SERVER_ERROR',
    details?: unknown,
    isOperational = true
  ) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.isOperational = isOperational

    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Invalid request input.', details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details, true)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required. Please sign in to continue.') {
    super(message, 401, 'UNAUTHORIZED', undefined, true)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden. You do not have permission to perform this action.') {
    super(message, 403, 'FORBIDDEN', undefined, true)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'The requested resource was not found.') {
    super(message, 404, 'NOT_FOUND', undefined, true)
  }
}

export class RateLimitError extends AppError {
  public readonly resetSeconds: number

  constructor(message: string, resetSeconds: number) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', { resetSeconds }, true)
    this.resetSeconds = resetSeconds
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = 'Request payload exceeds maximum allowed size.') {
    super(message, 413, 'PAYLOAD_TOO_LARGE', undefined, true)
  }
}

/**
 * Converts any caught error into a safe, structured JSON response.
 * Never leaks stack traces or unhandled internal system details in production.
 */
export function formatErrorResponse(error: unknown): NextResponse<StructuredErrorResponse> {
  if (error instanceof AppError) {
    const headers: Record<string, string> = {}
    if (error instanceof RateLimitError) {
      headers['Retry-After'] = String(error.resetSeconds)
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        errorDetail: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      },
      { status: error.statusCode, headers }
    )
  }

  // Handle unexpected or foreign errors (e.g. database exceptions, 3rd party API failures)
  console.error('Unhandled internal error:', error)

  const isDev = process.env.NODE_ENV === 'development'
  const safeMessage = isDev && error instanceof Error
    ? error.message
    : 'An unexpected internal error occurred. Please try again later.'

  return NextResponse.json(
    {
      success: false,
      error: safeMessage,
      errorDetail: {
        code: 'INTERNAL_SERVER_ERROR',
        message: safeMessage,
      },
    },
    { status: 500 }
  )
}
