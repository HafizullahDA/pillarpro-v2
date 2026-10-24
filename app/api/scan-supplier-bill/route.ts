import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'
import { canCreateSupplier } from '@/lib/permissions'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { scanImageRequestSchema } from '@/lib/validations/api'
import { parseBase64Payload } from '@/lib/base64'
import {
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
  ValidationError,
  AppError,
  formatErrorResponse,
} from '@/lib/errors/AppError'

export const maxDuration = 60

// Rate limit configuration: 10 supplier invoice scans per user every 2 minutes
const RATE_LIMIT_CONFIG = {
  limit: 10,
  windowMs: 2 * 60 * 1000,
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]

const sanitizeString = (max: number) =>
  z.preprocess((val) => {
    if (val === null || val === undefined) return null
    if (typeof val === 'string') {
      const trimmed = val.trim()
      return trimmed === '' ? null : trimmed.slice(0, max)
    }
    return String(val).trim().slice(0, max)
  }, z.string().max(max).nullable())

const dateSchema = z.preprocess((val) => {
  if (val === null || val === undefined) return null
  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (!trimmed) return null
    const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/)
    return match ? match[1] : null
  }
  return null
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').nullable())

const coerceNumber = z.preprocess((val) => {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number') {
    return isNaN(val) ? null : val
  }
  if (typeof val === 'string') {
    const cleaned = val.replace(/[₹$,\s]/g, '').trim()
    if (!cleaned) return null
    const num = Number(cleaned)
    return isNaN(num) ? null : num
  }
  return null
}, z.number().nullable())

const supplierScanOutputSchema = z.object({
  supplier_name: sanitizeString(200),
  gst_number: sanitizeString(20),
  contact_number: sanitizeString(30),
  address: sanitizeString(500),
  date: dateSchema,
  reference: sanitizeString(100),
  project_name: sanitizeString(200),
  description: sanitizeString(1000),
  quantity: coerceNumber,
  unit: sanitizeString(50),
  rate: coerceNumber,
  carriage_amount: coerceNumber,
  amount: coerceNumber,
}).strip()

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user via Supabase session
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new UnauthorizedError('Authentication required. Please sign in to scan supplier invoices.')
    }

    // 2. Authorize user role
    const { data: userRole } = await supabase.rpc('get_user_role')
    if (!canCreateSupplier(userRole as string | null)) {
      throw new ForbiddenError('Forbidden. Your role does not have permission to add supplier procurements.')
    }

    // 3. Enforce sliding-window rate limit
    const clientIp = getClientIp(req)
    const rateLimitKey = `scan-supplier-bill:${user.id || clientIp}`
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIG)

    if (!rateLimit.success) {
      throw new RateLimitError(
        `Rate limit reached. You can scan up to ${RATE_LIMIT_CONFIG.limit} invoices every 2 minutes. Please wait ${rateLimit.resetSeconds}s.`,
        rateLimit.resetSeconds
      )
    }

    // 4. Validate Google Gemini API key
    const apiKey =
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY

    if (!apiKey) {
      throw new AppError('AI vision scanner is not properly configured in this environment.', 500)
    }

    // 5. Parse and validate request body with Zod
    const rawBody = await req.json().catch(() => ({}))
    const parseResult = scanImageRequestSchema.safeParse(rawBody)
    if (!parseResult.success) {
      throw new ValidationError(
        parseResult.error.issues[0]?.message || 'Invalid supplier invoice image payload.',
        parseResult.error.flatten()
      )
    }

    const { base64Data, mimeType } = parseBase64Payload(parseResult.data.imageBase64, 'image/jpeg')

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new ValidationError(
        `Unsupported file type: ${mimeType}. Please upload an image (JPEG, PNG, WEBP, HEIC) or PDF.`
      )
    }

    const ai = new GoogleGenAI({ apiKey })

    const prompt = `Analyze this construction material invoice, GST tax bill, delivery challan, weighbridge slip, or khata slip.
Extract structured supplier and procurement details.
Return raw JSON ONLY matching this exact structure:
{
  "supplier_name": "Vendor / Dealer / Agency / Store name or null if missing or illegible",
  "gst_number": "15-digit GSTIN or null",
  "contact_number": "Phone or mobile number or null",
  "address": "Supplier shop/yard address or city or null",
  "date": "YYYY-MM-DD or null if missing",
  "reference": "Invoice number, bill number, or challan number or null",
  "project_name": "Site name / Project name / Delivery destination if specified on invoice, else null",
  "description": "Short description of items / materials (e.g. 100 bags Ultratech Cement, 12mm TMT Steel bars)",
  "quantity": 100 or null if not applicable,
  "unit": "bags|tonnes|nos|kg|cum|sqm|rmt|litre|trips or null",
  "rate": 380 or null if not indicated,
  "carriage_amount": 2000 or null if no separate freight/transport/loading/carriage charges,
  "amount": 40000 or null if total cannot be determined
}

Rules:
1. If quantity, rate, and carriage are present, verify amount = (quantity * rate) + carriage.
2. If supplier name is not clearly visible or missing, set supplier_name to null.
3. If project name is not mentioned (very common on vendor invoices), set project_name to null.
4. Normalize dates to YYYY-MM-DD format.
5. Return valid JSON only with no markdown or codeblocks.`

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType,
      },
    }

    const primaryModel = process.env.GEMINI_PRIMARY_MODEL || 'gemini-3.6-flash'
    const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite'

    let responseText = ''
    try {
      const response = await ai.models.generateContent({
        model: primaryModel,
        contents: [prompt, imagePart],
        config: {
          responseMimeType: 'application/json',
        },
      })
      responseText = response.text?.trim() ?? ''
    } catch (primaryErr: any) {
      console.warn(`Primary model ${primaryModel} failed for supplier OCR, falling back to ${fallbackModel}:`, primaryErr.message)
      const fallbackResponse = await ai.models.generateContent({
        model: fallbackModel,
        contents: [prompt, imagePart],
        config: {
          responseMimeType: 'application/json',
        },
      })
      responseText = fallbackResponse.text?.trim() ?? ''
    }

    const cleanJsonStr = responseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim()

    let rawExtracted: unknown
    try {
      rawExtracted = JSON.parse(cleanJsonStr)
    } catch {
      throw new AppError('Failed to parse AI structured response from invoice. Please try with a clearer photo.', 422)
    }

    const parseOutput = supplierScanOutputSchema.safeParse(rawExtracted)
    if (!parseOutput.success) {
      throw new AppError('AI response format was invalid. Please try with a clearer photo.', 422)
    }

    const extracted = parseOutput.data

    return NextResponse.json(
      { success: true, data: extracted },
      {
        headers: {
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      }
    )
  } catch (err: unknown) {
    return formatErrorResponse(err)
  }
}
