import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'
import { canCreateExpense } from '@/lib/permissions'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

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
      return NextResponse.json(
        { error: 'Authentication required. Please sign in to scan receipts.' },
        { status: 401 }
      )
    }

    // 2. Authorize user role (must have permission to create expenses)
    const { data: userRole } = await supabase.rpc('get_user_role')
    if (!canCreateExpense(userRole as string | null)) {
      return NextResponse.json(
        { error: 'Forbidden. Your role does not have permission to scan receipts or add expenses.' },
        { status: 403 }
      )
    }

    // 3. Enforce sliding-window rate limit (keyed by user ID)
    const clientIp = getClientIp(req)
    const rateLimitKey = `scan-receipt:${user.id || clientIp}`
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIG)

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: `Rate limit reached. You can scan up to ${RATE_LIMIT_CONFIG.limit} receipts every 2 minutes. Please wait ${rateLimit.resetSeconds}s before scanning another receipt.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.resetSeconds),
            'X-RateLimit-Limit': String(rateLimit.limit),
            'X-RateLimit-Remaining': '0',
          },
        }
      )
    }

    // 4. Validate Google Gemini API key
    const apiKey =
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GOOGLE_GENERATIVE_AI_API_KEY is not configured in .env.local' },
        { status: 500 }
      )
    }

    // 5. Parse request body
    const { imageBase64 } = await req.json()
    if (!imageBase64) {
      return NextResponse.json({ error: 'imageBase64 field is required' }, { status: 400 })
    }

    // Guard against oversized images (Vercel serverless request body is 4.5MB max)
    if (imageBase64.length > 6 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Receipt image is too large (> 4.5 MB). Please take a smaller photo or compress it.' },
        { status: 413 }
      )
    }

    // Strip header prefix if present (e.g., data:image/png;base64,)
    const base64Data = imageBase64.includes(',')
      ? imageBase64.split(',')[1]
      : imageBase64

    // Detect mime type
    let mimeType = 'image/jpeg'
    if (imageBase64.startsWith('data:image/png')) mimeType = 'image/png'
    if (imageBase64.startsWith('data:image/webp')) mimeType = 'image/webp'

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

    const extracted = JSON.parse(cleanJsonStr)

    return NextResponse.json(
      { success: true, data: extracted },
      {
        headers: {
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      }
    )
  } catch (err: any) {
    console.error('Receipt Scan Error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to analyze receipt image' },
      { status: 500 }
    )
  }
}
