import { GoogleGenAI } from '@google/genai'
import { ProjectContractContext } from './contractContextAggregator'
import { AppError } from '../errors/AppError'

export interface ContractAiQueryOptions {
  userQuery: string
  context: ProjectContractContext
  conversationHistory?: Array<{ role: 'user' | 'model'; content: string }>
}

export interface ContractAiResponse {
  answer: string
  modelUsed: string
  groundingStatus: 'VERIFIED' | 'DATA_MISSING' | 'INTERPRETED'
  referencedRecordIds: string[]
  unverifiedRecordIds: string[]
  hasDisclaimer: boolean
}

const STATUTORY_LEGAL_DISCLAIMER =
  '\n\n---\n> **Statutory Disclaimer**: *PillarPro ContractIQ is an analytical documentation assistant. This report does not constitute definitive legal advice, contractual dispute representation, or a guarantee that an Extension of Time (EOT) or financial claim will succeed. All submissions must be vetted by your project director and legal counsel against the official signed tender agreement.*'

/**
 * Builds the strict closed-world prompt (Layer 2 & 3 of the Zero-Hallucination Shield).
 * Embeds authoritative ERP metrics: Contract Value, Billed Value, Executed e-MB Value, overdue BGs/FDRs, and open hindrances.
 */
export function buildSystemPrompt(context: ProjectContractContext): string {
  const fm = context.financialMetrics
  const overdueBgs = (context.securityDeposits ?? []).filter((s) => s.isOverdue)
  const openHindrances = (context.hindrances ?? []).filter(
    (h) => h.status === 'open' || h.status === 'ACTIVE' || !h.end_date || h.standard_status === 'open'
  )

  const overdueBgText =
    overdueBgs.length === 0
      ? 'None (All recorded Bank Guarantees and Fixed Deposit Receipts are within validity).'
      : overdueBgs
          .map(
            (b) =>
              `- [OVERDUE BG/FDR]: ${b.deposit_type.toUpperCase()} #${b.reference_number} (${b.issuing_bank || 'Bank'}), Amount: ₹${b.amount.toLocaleString('en-IN')}, Expired on: ${b.expiry_date} (${Math.abs(b.daysUntilExpiry)} days overdue!)`
          )
          .join('\n')

  const openHindranceText =
    openHindrances.length === 0
      ? 'None (No active unresolved site hindrances recorded).'
      : openHindrances
          .map(
            (h) =>
              `- [OPEN HINDRANCE #${h.hindrance_number}]: ${h.description} (Started: ${h.start_date}, Net Delay: ${h.net_delay_days || h.duration_days || 0} days, Notice Served: ${h.notice_served ? 'YES' : 'NO'}, Affected Front: ${h.affected_work || 'Site Front'})`
          )
          .join('\n')

  return `You are PillarPro ContractIQ, an expert Senior Indian Government Construction Contract Specialist (CPWD, State PWD, NHAI, MoRTH, MES, Railways, PSUs).

MISSION & OPERATIONAL SCOPE:
You assist contractors, billing engineers, and project managers in auditing their contract records, identifying delays, tracking notice deadlines, evaluating clause requirements, and spotting missing evidence.

================================================================================
EXECUTIVE PROJECT AUDIT CONTEXT (AUTHORITATIVE ERP SUMMARY)
================================================================================
Project Name: ${context.project?.name || 'Unknown Project'}
Contracting Authority: ${context.project?.agency_name || context.contract?.authority_name || 'Government Department'}
Agreement / Work Order No: ${context.contract?.agreement_number || context.contract?.contract_number || 'N/A'}
Work Description: ${context.contract?.work_name || context.project?.name || 'N/A'}
Project Status: ${context.project?.status || context.contract?.status || 'ACTIVE'}
Stipulated Completion Date: ${context.contract?.stipulated_completion_date || context.project?.end_date || 'N/A'}
Current / Revised Completion Date: ${context.contract?.actual_completion_date || 'N/A'}

FINANCIAL VALUES & CASH FLOW:
- Contract Value: ₹${(fm?.contractValue ?? 0).toLocaleString('en-IN')}
- Billed Value (Gross Certified RA Bills): ₹${(fm?.billedValue ?? 0).toLocaleString('en-IN')}
- Executed e-MB Value (Measured on Site): ₹${(fm?.executedEmbValue ?? 0).toLocaleString('en-IN')}
- Paid to Date by Client: ₹${(fm?.paidValue ?? 0).toLocaleString('en-IN')}
- Outstanding Certified Receivables: ₹${(fm?.outstandingRaBalance ?? 0).toLocaleString('en-IN')}

STATUTORY COMPLIANCE & DELAY EXPOSURE:
- Open / Unresolved Site Hindrances: ${fm?.openHindrancesCount ?? 0} active hindrances
${openHindranceText}

- Overdue Bank Guarantees / FDRs: ${fm?.overdueBgsCount ?? 0} overdue instruments
${overdueBgText}

- Electronic Measurement Book (e-MB): ${fm?.totalEmbEntriesCount ?? 0} total measurement entries logged
- Bill of Quantities (BOQ): ${context.boqSummary?.totalItems ?? 0} scheduled items recorded
================================================================================

NON-NEGOTIABLE ZERO-HALLUCINATION RULES:
1. STRICT CLOSED-WORLD ASSUMPTION: You ONLY know the factual details provided inside the <project_data> JSON below and the executive summary above. If any date, clause, notice, bill, or quantity is NOT explicitly present in this JSON, you MUST state: "Record Not Found in System" or "Not recorded in PillarPro".
2. NEVER INVENT DATES, CLAUSES, AMOUNTS, OR NOTICE PERIODS: Do not assume standard CPWD 14-day rules unless verified in the <clauses> block or specifically noted as a general statutory guideline under [AI INTERPRETATION].
3. NEVER GIVE DEFINITIVE LEGAL ADVICE: Never advise that a claim "will succeed", "is guaranteed to be paid", or that the contractor "has an open-and-shut case".
4. NEVER INVENT CONTRACTUAL RIGHTS: Ground every entitlement to an exact clause reference from <clauses> or state that the specific right is unverified in records.
5. EXPLICIT RECORD CITATIONS: Always cite the exact record identifier (e.g. [Hindrance #H-001], [Event: EV-01], [RA Bill 03], [Letter Ref: PP/NH31/042], [BOQ Item 2.04], [e-MB Entry #1]).

STRICT 4-TIER OUTPUT TAXONOMY (You MUST prefix every section and finding with one of these tags):
- [FACT]: Verifiable, immutable system records (e.g., approved RA bills, recorded contract amounts, original completion dates, verified bank receipts).
- [USER-RECORDED DATA]: Information entered by site personnel that has NOT been officially sanctioned or approved by the Employer/Department (e.g., draft hindrances, uncertified delay durations, pending claims).
- [CONTRACT TEXT]: Direct quotes or faithful summaries of clauses from the contract. For every clause you mention, you MUST provide:
  * Document Title (e.g. General Conditions of Contract)
  * Page / Section where available (e.g. Vol 1, Page 38)
  * Clause Number (e.g. Clause 5.2, Clause 10CC, Clause 2)
- [AI INTERPRETATION]: Analytical correlation, timeline gap analysis, or risk assessment synthesized by you (e.g., notice sent 19 days after hindrance vs 14-day stipulation).

WHEN ASKED "What is delaying this project?" OR SIMILAR DELAY QUESTIONS:
Always inspect actual records and systematically address:
1. Open & Unresolved Hindrances (with recorded durations, causes, and critical path status)
2. Contract Events (site handover holdups, drawing revisions, weather)
3. Financial & Physical Execution Gap (Contract Value vs Executed e-MB vs Billed Value)
4. Bank Guarantee / Security Deposit Risks (any overdue BGs/FDRs)
5. Relevant Contract Clauses & Notice Deadlines (e.g. Clause 5 EOT rules, 14-day statutory notices)
6. Formal Correspondence & Department Notices (letters dispatched, speed post tracking)
7. Evidence Vault Completeness (available photographs/joint reports vs MISSING evidence)
8. Contractual Risk & Compliance Summary

<project_data>
${JSON.stringify(context, null, 2)}
</project_data>`
}

/**
 * Validates generated content against known database IDs (Layer 4 of the Zero-Hallucination Shield).
 */
export function verifyGrounding(
  responseContent: string,
  knownRecordIds: string[]
): {
  referencedRecordIds: string[]
  unverifiedRecordIds: string[]
} {
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
  const matches = responseContent.match(uuidRegex) || []
  const uniqueUuids = Array.from(new Set(matches.map((m) => m.toLowerCase())))

  const knownSet = new Set(knownRecordIds.map((id) => id.toLowerCase()))
  const referencedRecordIds: string[] = []
  const unverifiedRecordIds: string[] = []

  for (const uuid of uniqueUuids) {
    if (knownSet.has(uuid)) {
      referencedRecordIds.push(uuid)
    } else {
      unverifiedRecordIds.push(uuid)
    }
  }

  return { referencedRecordIds, unverifiedRecordIds }
}

/**
 * Safely sanitizes AI engine and provider errors into clear, actionable enterprise messages.
 * Prevents raw provider JSON dumps (e.g. {"error":{"code":503,...}}) from leaking to the UI.
 */
export function cleanAiErrorMessage(error: any): string {
  if (!error) {
    return 'The ContractIQ service is temporarily unavailable. Please retry in a few moments.'
  }

  const rawMessage =
    typeof error === 'string'
      ? error
      : error?.message || error?.error?.message || error?.toString() || ''

  // 1. Attempt to extract nested JSON message if rawMessage contains an error object string
  try {
    const jsonMatch = rawMessage.match(/\{[\s\S]*"error"[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      const inner = parsed?.error?.message || parsed?.message
      if (typeof inner === 'string') {
        const innerLower = inner.toLowerCase()
        if (
          innerLower.includes('high demand') ||
          innerLower.includes('unavailable') ||
          parsed?.error?.status === 'UNAVAILABLE' ||
          parsed?.error?.code === 503
        ) {
          return 'The AI engine is temporarily experiencing high server demand. We automatically retried backup models. Please click Retry below in a few moments.'
        }
        if (innerLower.includes('quota') || parsed?.error?.code === 429) {
          return 'AI query rate limit temporarily reached. Please wait a moment and click Retry.'
        }
        if (inner.trim().length > 0) {
          return inner.trim()
        }
      }
    }
  } catch {
    // Ignore JSON parsing exceptions
  }

  // 2. Pattern matching for standard high demand, quota, or unavailable codes
  const lower = rawMessage.toLowerCase()
  if (
    lower.includes('503') ||
    lower.includes('high demand') ||
    lower.includes('unavailable') ||
    lower.includes('overloaded')
  ) {
    return 'The AI engine is temporarily experiencing high server demand. We automatically retried backup models. Please click Retry below in a few moments.'
  }
  if (lower.includes('429') || lower.includes('quota') || lower.includes('resource_exhausted')) {
    return 'AI query rate limit temporarily reached. Please wait a few moments and click Retry.'
  }
  if (lower.includes('aborterror') || lower.includes('timed out') || lower.includes('aborted')) {
    return 'Analysis timed out while inspecting large ERP records. Please click Retry.'
  }
  if (lower.includes('api key') || lower.includes('unauthenticated')) {
    return 'AI service configuration issue. Please contact your workspace administrator.'
  }

  // 3. Fallback sanitized string without raw braces or code dumps
  const stripped = rawMessage.replace(/\{[\s\S]*?\}|\[[\s\S]*?\]/g, '').trim()
  return (
    stripped ||
    'The ContractIQ service is temporarily busy. Please click Retry below in a few moments.'
  )
}

/**
 * Invokes Gemini model to answer contract queries with strict grounding.
 */
export async function runContractAiQuery(
  options: ContractAiQueryOptions
): Promise<ContractAiResponse> {
  const { userQuery, context, conversationHistory = [] } = options

  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY

  if (!apiKey) {
    throw new AppError(
      'Google Gemini AI API key is not configured in this environment.',
      500
    )
  }

  const ai = new GoogleGenAI({ apiKey })
  const systemInstruction = buildSystemPrompt(context)

  // Construct message contents
  const contents: any[] = []

  // Add conversation history if present
  for (const turn of conversationHistory) {
    contents.push({
      role: turn.role,
      parts: [{ text: turn.content }],
    })
  }

  // Add the current user prompt
  contents.push({
    role: 'user',
    parts: [{ text: userQuery }],
  })

  const primaryModel = process.env.GEMINI_PRIMARY_MODEL || 'gemini-3.6-flash'
  const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite'
  const modelsToTry = Array.from(
    new Set([
      primaryModel,
      fallbackModel,
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3.7-flash',
      'gemini-3.8-flash',
    ])
  ).filter(Boolean)
  let rawText = ''
  let selectedModel = primaryModel
  let lastError: any = null

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i]
    try {
      selectedModel = model
      const result = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          temperature: 0.1, // Near-deterministic precision to minimize creative drift
        },
      })

      rawText = result.text?.trim() || ''
      if (rawText) break
    } catch (err: any) {
      lastError = err
      console.warn(`[ContractAI] Model ${model} failed, attempting next model fallback:`, err?.message || err)
      // Jitter delay between model fallbacks on 503 or 429
      if (i < modelsToTry.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 600))
      }
    }
  }

  if (!rawText) {
    const friendlyError = cleanAiErrorMessage(lastError)
    throw new AppError(friendlyError, 503)
  }

  // Layer 4 Verification: Ensure response has the statutory disclaimer and check UUID references
  let finalAnswer = rawText
  if (!finalAnswer.includes('Statutory Disclaimer') && !finalAnswer.includes('does not constitute definitive legal advice')) {
    finalAnswer += STATUTORY_LEGAL_DISCLAIMER
  }

  const { referencedRecordIds, unverifiedRecordIds } = verifyGrounding(
    finalAnswer,
    context.knownRecordIds || []
  )

  const isDataMissing =
    finalAnswer.toLowerCase().includes('record not found') ||
    finalAnswer.toLowerCase().includes('not recorded in pillarpro')

  return {
    answer: finalAnswer,
    modelUsed: selectedModel,
    groundingStatus: isDataMissing
      ? 'DATA_MISSING'
      : unverifiedRecordIds.length === 0
      ? 'VERIFIED'
      : 'INTERPRETED',
    referencedRecordIds,
    unverifiedRecordIds,
    hasDisclaimer: true,
  }
}
