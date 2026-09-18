import { NextRequest, NextResponse } from 'next/server'
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

// Rate limit configuration: 10 supplier invoice scans per user every 2 minutes
const RATE_LIMIT_CONFIG = {
  limit: 10,
  windowMs: 2 * 60 * 1000,
}

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
  "amount": 38000 or null if total cannot be determined
}

Rules:
1. If quantity and rate are present, calculate or verify amount = quantity * rate.
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

    // Try gemini-3.6-flash first; fallback to gemini-3.5-flash-lite if needed
    let responseText = ''
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [prompt, imagePart],
        config: {
          responseMimeType: 'application/json',
        },
      })
      responseText = response.text?.trim() ?? ''
    } catch (primaryErr: any) {
      console.warn('gemini-3.6-flash failed for supplier OCR, falling back to gemini-3.5-flash-lite:', primaryErr.message)
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
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

    let extracted: any
    try {
      extracted = JSON.parse(cleanJsonStr)
    } catch {
      throw new AppError('Failed to parse AI structured response from invoice. Please try with a clearer photo.', 422)
    }

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
