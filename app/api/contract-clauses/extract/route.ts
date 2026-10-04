import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { parseBase64Payload } from '@/lib/base64'
import {
  UnauthorizedError,
  RateLimitError,
  AppError,
  formatErrorResponse,
} from '@/lib/errors/AppError'
import { AIClauseExtractionResult } from '@/lib/types/contractClauses'

const RATE_LIMIT_CONFIG = {
  limit: 10,
  windowMs: 2 * 60 * 1000,
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new UnauthorizedError('Authentication required to extract contract clauses.')
    }

    const clientIp = getClientIp(req)
    const rateLimitKey = `contract-clause-extract:${user.id || clientIp}`
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIG)
    if (!rateLimit.success) {
      throw new RateLimitError(
        `Rate limit reached. Please wait ${rateLimit.resetSeconds}s before scanning another contract document.`,
        rateLimit.resetSeconds
      )
    }

    const apiKey =
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY

    if (!apiKey) {
      throw new AppError('AI Contract Analysis service is not configured in this environment.', 500)
    }

    const body = await req.json().catch(() => ({}))
    const { documentBase64, documentText, documentTitle, contractType } = body

    if (!documentBase64 && !documentText) {
      return NextResponse.json(
        { error: 'Please provide document text or document base64 data to extract clauses.' },
        { status: 400 }
      )
    }

    const ai = new GoogleGenAI({ apiKey })

    const prompt = `You are a Senior Indian Government Construction Contract Specialist (CPWD, PWD, NHAI, MoRTH, MES, Railways, PSUs).
Analyze this contract document excerpt/document and extract candidate commercial parameters and contractual clauses.

CRITICAL RULES:
1. NEVER INVENT OR FABRICATE A CLAUSE. If a clause, milestone, or notice period is NOT present in the provided text, do not invent it. Return null or omit.
2. ALL extractions are treated as DRAFT / UNVERIFIED candidates. The user must manually review and verify against the physical contract.
3. For every extracted clause, provide its exact clause number (e.g. "Clause 5", "Clause 10CC", "Sub-Clause 20.1", "Clause 2"), verbatim or faithful excerpt, source page/para reference, and categorize into one of:
   - EOT (Extension of Time, hindrances, Force Majeure)
   - PAYMENT (RA Bills, final bills, payment timelines)
   - MEASUREMENT (MB rules, joint measurements, test check)
   - VARIATION (Variations, extra items, substituted items)
   - DEVIATION (Deviation limit +/- 30%, market rate trigger)
   - ESCALATION (Clause 10CA, 10CC, price index adjustments)
   - LD (Liquidated Damages, delay compensation, show cause)
   - SECURITY (Security Deposit, deduction, release)
   - BG (Bank Guarantee, PBG validity, renewal)
   - RETENTION (Retention percentage withheld from bills)
   - INSURANCE (CAR policy, workmen compensation, third party)
   - QUALITY (Material testing, laboratory tests, rejections)
   - SAFETY (PPE, site barricades, safety penalties)
   - CORRESPONDENCE (Official dispatch, notices, speed post tracking)
   - DISPUTE (DRC, conciliation, settlement)
   - ARBITRATION (Arbitrator appointment, seat of arbitration)
   - OTHER (General conditions, subcontracting, site clearance)

Return raw JSON ONLY matching this exact structure:
{
  \"candidate_params\": {
    \"contract_value\": 50000000,
    \"completion_date\": \"YYYY-MM-DD or null\",
    \"dlp_months\": 12,
    \"earnest_money_deposit\": null,
    \"performance_security_amount\": null,
    \"performance_security_percent\": 5,
    \"security_deposit_amount\": null,
    \"security_deposit_percent\": 2.5,
    \"retention_percentage\": 5,
    \"liquidated_damages_percent_per_week\": 0.5,
    \"liquidated_damages_max_cap_percent\": 10,
    \"eot_notice_days\": 14,
    \"source_page_ref\": \"Page / section where summary values found\"
  },
  \"extracted_clauses\": [
    {
      \"clause_number\": \"Clause 5\",
      \"clause_title\": \"Extension of Time for Delay\",
      \"clause_text\": \"The contractor shall give notice to the Engineer-in-Charge in writing within 14 days of the date of occurrence of any hindrance...\",
      \"category\": \"EOT\",
      \"notice_period_days\": 14,
      \"payment_requirement\": null,
      \"eot_relevance\": true,
      \"variation_relevance\": false,
      \"claim_relevance\": true,
      \"bg_relevance\": false,
      \"retention_relevance\": false,
      \"ld_relevance\": false,
      \"escalation_relevance\": false,
      \"source_page_ref\": \"Page 14, Section IV (GCC)\",
      \"ai_confidence_score\": 0.95,
      \"ai_extraction_notes\": \"Statutory CPWD Form 27 14-day notice requirement\"
    }
  ]
}

Do NOT wrap the output in markdown fences or backticks. Return raw valid JSON only.`

    let contents: any[] = []

    if (documentBase64) {
      const { base64Data, mimeType } = parseBase64Payload(documentBase64, 'application/pdf')
      contents = [
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType,
          },
        },
      ]
    } else {
      contents = [
        prompt,
        `Document Title: ${documentTitle || 'Contract Agreement'}\nContract Type: ${contractType || 'Item Rate'}\n\nDocument Text Content:\n${documentText}`,
      ]
    }

    let response: any
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents,
        config: {
          responseMimeType: 'application/json',
        },
      })
    } catch (primaryErr: any) {
      console.warn('gemini-3.6-flash failed for contract extraction, falling back to gemini-3.5-flash:', primaryErr?.message)
      response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents,
        config: {
          responseMimeType: 'application/json',
        },
      })
    }

    const responseText = response.text?.trim() ?? ''
    const cleanJsonStr = responseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim()

    let parsed: any
    try {
      parsed = JSON.parse(cleanJsonStr)
    } catch (parseErr) {
      console.error('Failed to parse Gemini contract extraction response:', cleanJsonStr)
      throw new AppError('AI response format was unreadable. Please retry scanning.', 502)
    }

    const rawClauses = Array.isArray(parsed.extracted_clauses) ? parsed.extracted_clauses : []

    const validatedClauses = rawClauses.map((c: any) => ({
      clause_number: String(c.clause_number || 'Clause'),
      clause_title: String(c.clause_title || 'Untitled Provision'),
      clause_text: String(c.clause_text || ''),
      category: c.category || 'OTHER',
      notice_period_days: typeof c.notice_period_days === 'number' ? c.notice_period_days : null,
      payment_requirement: c.payment_requirement || null,
      eot_relevance: Boolean(c.eot_relevance),
      variation_relevance: Boolean(c.variation_relevance),
      claim_relevance: Boolean(c.claim_relevance),
      bg_relevance: Boolean(c.bg_relevance),
      retention_relevance: Boolean(c.retention_relevance),
      ld_relevance: Boolean(c.ld_relevance),
      escalation_relevance: Boolean(c.escalation_relevance),
      status: 'DRAFT',
      is_ai_extracted: true,
      source_page_ref: c.source_page_ref || 'Source document excerpt',
      source_document_title: documentTitle || 'Uploaded Contract Document',
      ai_confidence_score: typeof c.ai_confidence_score === 'number' ? c.ai_confidence_score : 0.85,
      ai_extraction_notes: c.ai_extraction_notes || 'AI extracted — verify against original contract.',
    }))

    const result: AIClauseExtractionResult = {
      candidate_params: parsed.candidate_params || {},
      extracted_clauses: validatedClauses,
      total_clauses_found: validatedClauses.length,
      document_title: documentTitle || 'Contract Document',
      disclaimer: 'AI extracted — verify against original contract. Never silently authoritative.',
    }

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('Error in contract clause extraction API:', err)
    return formatErrorResponse(err)
  }
}
