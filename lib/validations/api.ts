import { z } from 'zod'

const MAX_IMAGE_BASE64_LENGTH = 6 * 1024 * 1024 // ~4.5MB binary
const MAX_DOC_BASE64_LENGTH = 10 * 1024 * 1024   // ~7.5MB binary (for PDFs/scans)

/**
 * Base64 image payload schema for vision OCR endpoints
 */
export const scanImageRequestSchema = z.object({
  imageBase64: z
    .string()
    .min(1, 'imageBase64 field is required.')
    .max(MAX_IMAGE_BASE64_LENGTH, 'Image payload is too large (> 4.5 MB). Please compress before uploading.'),
})

/**
 * Base64 document payload schema (allows larger size for multi-page RA Bill PDFs)
 */
export const scanDocumentRequestSchema = z.object({
  imageBase64: z
    .string()
    .min(1, 'imageBase64 field is required.')
    .max(MAX_DOC_BASE64_LENGTH, 'Document payload is too large (> 7.5 MB). Please compress or optimize the PDF.'),
})

/**
 * Authentication rate-limit check schema
 */
export const authRateLimitRequestSchema = z.object({
  action: z.enum(['sign-in', 'sign-up']).default('sign-in'),
})

/**
 * Production client error logging schema
 */
export const logErrorRequestSchema = z.object({
  context: z.string().min(1, 'context is required'),
  message: z.string().min(1, 'message is required'),
  metadata: z.record(z.string(), z.unknown()).optional(),
  url: z.string().optional(),
  timestamp: z.string().optional(),
})

export type ScanImageRequest = z.infer<typeof scanImageRequestSchema>
export type ScanDocumentRequest = z.infer<typeof scanDocumentRequestSchema>
export type AuthRateLimitRequest = z.infer<typeof authRateLimitRequestSchema>
export type LogErrorRequest = z.infer<typeof logErrorRequestSchema>

