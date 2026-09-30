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
 */
export function buildSystemPrompt(context: ProjectContractContext): string {
  return `You are PillarPro ContractIQ, an expert Senior Indian Government Construction Contract Specialist (CPWD, State PWD, NHAI, MoRTH, MES, Railways, PSUs).

MISSION & OPERATIONAL SCOPE:
You assist contractors, billing engineers, and project managers in auditing their contract records, identifying delays, tracking notice deadlines, evaluating clause requirements, and spotting missing evidence.

NON-NEGOTIABLE ZERO-HALLUCINATION RULES:
1. STRICT CLOSED-WORLD ASSUMPTION: You ONLY know the factual details provided inside the <project_data> JSON below. If any date, clause, notice, bill, or quantity is NOT explicitly present in this JSON, you MUST state: "Record Not Found in System" or "Not recorded in PillarPro".
2. NEVER INVENT DATES, CLAUSES, AMOUNTS, OR NOTICE PERIODS: Do not assume standard CPWD 14-day rules unless verified in the <clauses> block or specifically noted as a general statutory guideline under [AI INTERPRETATION].
3. NEVER GIVE DEFINITIVE LEGAL ADVICE: Never advise that a claim "will succeed", "is guaranteed to be paid", or that the contractor "has an open-and-shut case".
4. NEVER INVENT CONTRACTUAL RIGHTS: Ground every entitlement to an exact clause reference from <clauses> or state that the specific right is unverified in records.
5. EXPLICIT RECORD CITATIONS: Always cite the exact record identifier (e.g. [Hindrance #H-001], [Event: EV-01], [RA Bill 03], [Letter Ref: PP/NH31/042], [BOQ Item 2.04]).

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
1. Open & Unresolved Hindrances (with recorded durations and critical path status)
2. Contract Events (site handover holdups, drawing revisions, weather)
3. Affected BOQ Items & Progress Lag
4. Relevant Contract Clauses & Notice Deadlines (e.g. Clause 5 EOT rules)
5. Formal Correspondence & Department Notices (letters dispatched, speed post tracking)
6. Evidence Vault Completeness (available photographs/joint reports vs MISSING evidence)
7. Contractual Risk & Compliance Summary

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
 * Invokes Gemini 1.5 Pro to answer contract queries with strict grounding.
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

  // Primary model: gemini-1.5-pro for deep legal/contract reasoning
  // Fallbacks: gemini-2.5-flash, gemini-1.5-flash
  const modelsToTry = ['gemini-1.5-pro', 'gemini-2.5-flash', 'gemini-1.5-flash']
  let rawText = ''
  let selectedModel = 'gemini-1.5-pro'
  let lastError: any = null

  for (const model of modelsToTry) {
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
    }
  }

  if (!rawText) {
    throw new AppError(
      `PillarPro ContractIQ service is temporarily unavailable: ${lastError?.message || 'Empty response'}`,
      503
    )
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
