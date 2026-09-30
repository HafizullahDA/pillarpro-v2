import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canAccessFeature, isSubscriptionActive } from '@/lib/subscription'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { contractAiChatRequestSchema } from '@/lib/validations/api'
import { getProjectContractContext } from '@/lib/ai/contractContextAggregator'
import { runContractAiQuery } from '@/lib/ai/contractAiEngine'
import {
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
  ValidationError,
  AppError,
  formatErrorResponse,
} from '@/lib/errors/AppError'

// Rate limit: 20 Contract AI queries per 10 minutes per user/IP
const RATE_LIMIT_CONFIG = {
  limit: 20,
  windowMs: 10 * 60 * 1000,
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user session
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new UnauthorizedError('Authentication required to access PillarPro Contract AI.')
    }

    // 2. Fetch organization subscription and enforce plan tier gates
    const { data: orgData } = await supabase
      .from('organizations')
      .select('plan_tier, subscription_status, trial_ends_at, current_period_end')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    // 2a. Check if active/valid subscription
    if (orgData && !isSubscriptionActive(orgData)) {
      throw new ForbiddenError(
        'Subscription required. Your workspace is currently in Read-Only mode. Please reactivate your plan to access PillarPro ContractIQ.'
      )
    }

    // 2b. Strictly gate ContractIQ to Growth and Enterprise tiers (Bootstrap is blocked!)
    const featureCheck = canAccessFeature('hasContractAi', orgData)
    if (!featureCheck.allowed) {
      return NextResponse.json(
        {
          error:
            'ContractIQ is an exclusive feature of the Growth Contractor (₹2,499/mo) and Enterprise Infra (₹4,599/mo) plans. Upgrade your subscription to unlock automated delay analysis, clause radar, and notice compliance audits.',
          code: 'FEATURE_GATED',
          requiredPlan: featureCheck.requiredPlan,
        },
        { status: 403 }
      )
    }

    // 3. Sliding-window rate limit
    const clientIp = getClientIp(req)
    const rateLimitKey = `contract-iq:${user.id || clientIp}`
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIG)
    if (!rateLimit.success) {
      throw new RateLimitError(
        `ContractIQ query limit reached. Please wait ${rateLimit.resetSeconds}s before sending another question.`,
        rateLimit.resetSeconds
      )
    }

    // 4. Validate request body
    const body = await req.json().catch(() => ({}))
    const parsed = contractAiChatRequestSchema.safeParse(body)
    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(' ')
      throw new ValidationError(errorMsg || 'Invalid Contract AI request payload.')
    }

    const { projectId, query, conversationHistory } = parsed.data

    // 5. Gather deterministic project context (Layer 1 of Shield)
    const context = await getProjectContractContext(supabase, projectId)

    if (!context.project) {
      throw new AppError('Project not found or you do not have permission to view it.', 404)
    }

    // 6. Execute Gemini with 4-Layer Zero-Hallucination Shield
    const result = await runContractAiQuery({
      userQuery: query,
      context,
      conversationHistory: conversationHistory?.map((h) => ({
        role: h.role,
        content: h.content,
      })),
    })

    return NextResponse.json({
      success: true,
      answer: result.answer,
      modelUsed: result.modelUsed,
      groundingStatus: result.groundingStatus,
      referencedRecordIds: result.referencedRecordIds,
      unverifiedRecordIds: result.unverifiedRecordIds,
      hasDisclaimer: result.hasDisclaimer,
    })
  } catch (error: any) {
    return formatErrorResponse(error)
  }
}
