import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'
import { canCreateAttendance } from '@/lib/permissions'
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

// Rate limit configuration: 10 attendance scans per user every 2 minutes
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
      throw new UnauthorizedError('Authentication required. Please sign in to scan attendance.')
    }

    // 2. Authorize user role
    const { data: userRole } = await supabase.rpc('get_user_role')
    if (!canCreateAttendance(userRole as string | null)) {
      throw new ForbiddenError('Forbidden. Your role does not have permission to mark or scan attendance.')
    }

    // 3. Enforce sliding-window rate limit
    const clientIp = getClientIp(req)
    const rateLimitKey = `scan-attendance:${user.id || clientIp}`
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIG)

    if (!rateLimit.success) {
      throw new RateLimitError(
        `Rate limit reached. You can scan up to ${RATE_LIMIT_CONFIG.limit} attendance sheets every 2 minutes. Please wait ${rateLimit.resetSeconds}s.`,
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
        parseResult.error.issues[0]?.message || 'Invalid muster roll image payload.',
        parseResult.error.flatten()
      )
    }

    const { base64Data, mimeType } = parseBase64Payload(parseResult.data.imageBase64, 'image/jpeg')

    const ai = new GoogleGenAI({ apiKey })

    const prompt = `Analyze this construction site muster roll, daily labor diary, or attendance register photo.
Extract structured worker attendance details.
Return raw JSON ONLY matching this exact structure:
{
  "date": "YYYY-MM-DD or null if not written",
  "project_name": "Site name or project name if written in header/notes, else null",
  "entries": [
    {
      "name": "Worker name (string)",
      "trade": "Mason|Helper|Carpenter|Plumber|Electrician|Welder|Painter|Driver|Operator|Supervisor|Other or null",
      "daily_wage_rate": 700 or null if rate is not written,
      "status": "present|half_day|absent|overtime"
    }
  ]
}

Rules:
1. "status" should be:
   - "present" for P, Present, tick mark, 1, or full day work
   - "half_day" for H, 1/2, Half Day, 0.5
   - "absent" for A, Absent, cross, or 0
   - "overtime" for OT, Overtime, 1.5, or 2
2. If daily_wage_rate or trade is not written or unclear, set them to null.
3. If project_name is not written, set it to null.
4. Extract all worker rows visible in the sheet.
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
      console.warn('gemini-3.6-flash failed for attendance OCR, falling back to gemini-3.5-flash-lite:', primaryErr.message)
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
      throw new AppError('Failed to parse AI structured response from muster roll. Please try with a clearer photo.', 422)
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
