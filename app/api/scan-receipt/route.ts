import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'
import { canCreateExpense } from '@/lib/permissions'
import { isSubscriptionActive } from '@/lib/subscription'
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

// Rate limit configuration: 10 receipt scans per user every 2 minutes
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
      throw new UnauthorizedError('Authentication required. Please sign in to scan receipts.')
    }

    // 2. Authorize user role (must have permission to create expenses)
    const { data: userRole } = await supabase.rpc('get_user_role')
    if (!canCreateExpense(userRole as string | null)) {
      throw new ForbiddenError('Forbidden. Your role does not have permission to scan receipts or add expenses.')
    }

    // 2b. Guard: Verify organization subscription is active
    const { data: orgData } = await supabase
      .from('organizations')
      .select('plan_tier, subscription_status, trial_ends_at, current_period_end')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (orgData && !isSubscriptionActive(orgData)) {
      throw new ForbiddenError(
        'Subscription required. Your workspace is currently in Read-Only mode. Please reactivate your plan to use the AI OCR Scanner.'
      )
    }

    // 3. Enforce sliding-window rate limit (keyed by user ID)
    const clientIp = getClientIp(req)
    const rateLimitKey = `scan-receipt:${user.id || clientIp}`
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIG)

    if (!rateLimit.success) {
      throw new RateLimitError(
        `Rate limit reached. You can scan up to ${RATE_LIMIT_CONFIG.limit} receipts every 2 minutes. Please wait ${rateLimit.resetSeconds}s before scanning another receipt.`,
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
        parseResult.error.issues[0]?.message || 'Invalid receipt image payload.',
        parseResult.error.flatten()
      )
    }

    const { base64Data, mimeType } = parseBase64Payload(parseResult.data.imageBase64, 'image/jpeg')

    const ai = new GoogleGenAI({ apiKey })

    const prompt = `Analyze this receipt image and extract structured expense details.
Return raw JSON ONLY matching this exact structure:
{
  "vendor_name": "Vendor or seller name string",
  "amount": 1250,
  "date": "YYYY-MM-DD",
  "category": "labor|material|equipment|transport|fuel|admin|tendering|other",
  "description": "Short description of items bought",
  "gst_number": "GST number if present or null"
}

If any value cannot be determined, provide a reasonable estimate or null.
Return valid JSON only. Do not format with markdown codeblocks or backticks.`

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType,
      },
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: [prompt, imagePart],
      config: {
        responseMimeType: 'application/json',
      },
    })

    const responseText = response.text?.trim() ?? ''

    // Clean JSON response (strip markdown wrappers if model added them)
    const cleanJsonStr = responseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim()

    let extracted: any
    try {
      extracted = JSON.parse(cleanJsonStr)
    } catch {
      throw new AppError('Failed to parse AI structured response. Please retry with a clearer photo.', 422)
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
