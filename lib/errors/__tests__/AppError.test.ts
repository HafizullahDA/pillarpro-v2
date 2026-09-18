import { describe, it, expect } from 'vitest'
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
  formatErrorResponse,
} from '../AppError'
import {
  scanImageRequestSchema,
  scanDocumentRequestSchema,
  authRateLimitRequestSchema,
  logErrorRequestSchema,
} from '../../validations/api'

describe('AppError Infrastructure', () => {
  it('creates typed AppError instances with correct status codes', () => {
    const err = new ValidationError('Bad name input', { field: 'name' })
    expect(err.statusCode).toBe(400)
    expect(err.code).toBe('VALIDATION_ERROR')
    expect(err.isOperational).toBe(true)
    expect(err.details).toEqual({ field: 'name' })
  })

  it('creates RateLimitError with Retry-After header support', () => {
    const err = new RateLimitError('Too many attempts', 45)
    expect(err.statusCode).toBe(429)
    expect(err.resetSeconds).toBe(45)

    const res = formatErrorResponse(err)
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('45')
  })

  it('formats structured error response without leaking internals in production', async () => {
    const foreignError = new Error('postgres password check failed at internal/db:5432')
    const res = formatErrorResponse(foreignError)
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.success).toBe(false)
    expect(json.errorDetail.code).toBe('INTERNAL_SERVER_ERROR')
  })
})

describe('API Zod Validation Schemas', () => {
  it('validates image scan payloads', () => {
    const valid = scanImageRequestSchema.safeParse({ imageBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==' })
    expect(valid.success).toBe(true)

    const missing = scanImageRequestSchema.safeParse({})
    expect(missing.success).toBe(false)

    const empty = scanImageRequestSchema.safeParse({ imageBase64: '' })
    expect(empty.success).toBe(false)
  })

  it('validates auth rate limit request payload', () => {
    const validSignIn = authRateLimitRequestSchema.safeParse({ action: 'sign-in' })
    expect(validSignIn.success).toBe(true)

    const validSignUp = authRateLimitRequestSchema.safeParse({ action: 'sign-up' })
    expect(validSignUp.success).toBe(true)

    const invalid = authRateLimitRequestSchema.safeParse({ action: 'delete-all' })
    expect(invalid.success).toBe(false)
  })

  it('validates log-error payloads', () => {
    const valid = logErrorRequestSchema.safeParse({
      context: 'NewRABillDrawer',
      message: 'Failed to submit',
      metadata: { field: 'bill_number' },
    })
    expect(valid.success).toBe(true)

    const missingContext = logErrorRequestSchema.safeParse({ message: 'Only message' })
    expect(missingContext.success).toBe(false)
  })
})
