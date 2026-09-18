import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'
import { canCreateRaBill } from '@/lib/permissions'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { scanDocumentRequestSchema } from '@/lib/validations/api'
import { parseBase64Payload } from '@/lib/base64'
import {
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
  ValidationError,
  AppError,
  formatErrorResponse,
} from '@/lib/errors/AppError'

// Rate limit configuration: 10 RA bill scans per user every 2 minutes
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
      throw new UnauthorizedError('Authentication required. Please sign in to scan RA bills.')
    }

    // 2. Authorize user role
    const { data: userRole } = await supabase.rpc('get_user_role')
    if (!canCreateRaBill(userRole as string | null)) {
      throw new ForbiddenError('Forbidden. Your role does not have permission to create or submit RA bills.')
    }

    // 3. Enforce sliding-window rate limit
    const clientIp = getClientIp(req)
    const rateLimitKey = `scan-ra-bill:${user.id || clientIp}`
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIG)

    if (!rateLimit.success) {
      throw new RateLimitError(
        `Rate limit reached. You can scan up to ${RATE_LIMIT_CONFIG.limit} bills every 2 minutes. Please wait ${rateLimit.resetSeconds}s.`,
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
    const parseResult = scanDocumentRequestSchema.safeParse(rawBody)
    if (!parseResult.success) {
      throw new ValidationError(
        parseResult.error.issues[0]?.message || 'Invalid RA bill document payload.',
        parseResult.error.flatten()
      )
    }

    const { base64Data, mimeType } = parseBase64Payload(parseResult.data.imageBase64, 'image/jpeg')

    const ai = new GoogleGenAI({ apiKey })

    const prompt = `You are an expert civil engineer and quantity surveyor specializing in Indian government infrastructure contracting, CPWD / State PWD / PMGSY / NHAI / Irrigation Running Account (RA) Bills (Form 26 / Standard Measurement Book Bills).

Analyze this scanned document, photo, or PDF of a Government RA Bill or Interim Payment Certificate.
Extract all key contract, measurement, and financial details into structured JSON.

Return raw JSON ONLY matching this exact JSON schema:
{
  "bill_number": "e.g. RA Bill 01, 2nd RA Bill, CC-03, Final Bill or null",
  "project_name": "Full name of work / contract / package / tender description as written on bill, or null",
  "agency_name": "Department / Division / Agency name (e.g. PWD, CPWD, NHAI, PMGSY, R&B, Irrigation) or null",
  "submission_date": "YYYY-MM-DD or null if missing",
  "suggested_billing_mode": "cumulative" or "standalone",
  "work_certified_amount": 4200000 or null,
  "retention_percentage": 5.0,
  "retention_amount": 210000 or null,
  "tds_amount": 84000 or null,
  "gst_tds_amount": 84000 or null,
  "labour_cess_amount": 42000 or null,
  "other_deductions_amount": 0 or null,
  "net_payable_amount": 3780000 or null,
  "previous_certified_amount": 0 or null,
  "remarks": "Contractor name, agreement no, or brief notes"
}

Critical Guidelines:
1. Billing Mode Detection:
   - "cumulative": If the document specifies "Total value of work executed up to date", "Since commencement of work", or contains columns for "Total up to date" vs "Since previous bill" (standard CPWD Form 26 Column 5/1).
   - "standalone": If the document only shows the work executed during this specific billing interval without cumulative totals.
2. If work certified amount is shown, extract the gross certified value before statutory deductions.
3. If retention percentage is mentioned (e.g. 5% security deposit / retention money), extract as decimal number (e.g. 5.0). Default to 5.0 if not explicit.
4. Parse statutory deductions if listed on the bill: Income Tax TDS (usually 1% or 2%), GST TDS (2%), Labour Welfare Cess (1%).
5. Normalize all dates to YYYY-MM-DD.
6. Return valid JSON only with no markdown wrapping or backticks.`

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType,
      },
    }

    // Primary: gemini-3.6-flash (optimized for complex tables and numerical OCR)
    // Fallback: gemini-3.5-flash-lite
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
      console.warn('gemini-3.6-flash failed for RA bill OCR, falling back to gemini-3.5-flash-lite:', primaryErr.message)
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
      throw new AppError('Failed to parse AI structured response from RA Bill. Please try with a clearer photo or PDF.', 422)
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
