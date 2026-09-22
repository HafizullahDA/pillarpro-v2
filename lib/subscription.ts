/**
 * PillarPro Central Subscription & Entitlement Engine.
 * 
 * Enforces the "Active Project Sites + Unlimited Users" commercial model,
 * evaluates real-time subscription validity, and provides feature-gating checks.
 */

export type PlanTier = 'bootstrap' | 'growth' | 'enterprise'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'expired' | 'canceled'

export interface PlanConfig {
  id: PlanTier
  name: string
  monthlyPrice: number
  annualPrice: number
  maxActiveSites: number
  hasForm26MB: boolean
  hasDelayDefense: boolean
  hasPartnerEquity: boolean
  hasForm27Dossier: boolean
  aiOcrMonthlyLimit: number
  hasTallySync: boolean
}

export const PLAN_CONFIGS: Record<PlanTier, PlanConfig> = {
  bootstrap: {
    id: 'bootstrap',
    name: 'Bootstrap',
    monthlyPrice: 999,
    annualPrice: 9999,
    maxActiveSites: 2,
    hasForm26MB: false,
    hasDelayDefense: false,
    hasPartnerEquity: false,
    hasForm27Dossier: false,
    aiOcrMonthlyLimit: 0,
    hasTallySync: false,
  },
  growth: {
    id: 'growth',
    name: 'Growth Contractor',
    monthlyPrice: 1999,
    annualPrice: 19999,
    maxActiveSites: 6,
    hasForm26MB: true,
    hasDelayDefense: true,
    hasPartnerEquity: true,
    hasForm27Dossier: false,
    aiOcrMonthlyLimit: 150,
    hasTallySync: false,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise Infra',
    monthlyPrice: 3999,
    annualPrice: 39999,
    maxActiveSites: 15,
    hasForm26MB: true,
    hasDelayDefense: true,
    hasPartnerEquity: true,
    hasForm27Dossier: true,
    aiOcrMonthlyLimit: 99999, // Unlimited
    hasTallySync: true,
  },
}

export interface SubscriptionOrgData {
  plan_tier?: string | null
  subscription_status?: string | null
  trial_ends_at?: string | null
  current_period_end?: string | null
  max_active_sites?: number | null
  created_at?: string | null
}

export interface EffectiveSubscription {
  planTier: PlanTier
  effectiveStatus: SubscriptionStatus
  isActive: boolean
  isTrialing: boolean
  isExpired: boolean
  trialDaysRemaining: number
  maxActiveSites: number
  planConfig: PlanConfig
}

/**
 * Evaluates whether an organization's subscription currently allows write operations.
 */
export function isSubscriptionActive(
  org?: SubscriptionOrgData | null,
  referenceDate: Date = new Date()
): boolean {
  if (!org) return false

  const status = (org.subscription_status || 'trialing').toLowerCase() as SubscriptionStatus

  if (status === 'trialing') {
    if (org.trial_ends_at) {
      return new Date(org.trial_ends_at).getTime() > referenceDate.getTime()
    }
    if (org.created_at) {
      const trialEndTime = new Date(org.created_at).getTime() + 14 * 24 * 60 * 60 * 1000
      return trialEndTime > referenceDate.getTime()
    }
    return true // Fallback to active 14-day trial for new workspaces
  }

  if (status === 'active') {
    if (!org.current_period_end) return true // Active without fixed expiry
    return new Date(org.current_period_end).getTime() > referenceDate.getTime()
  }

  // 'past_due', 'expired', 'canceled'
  return false
}

/**
 * Calculates days remaining in a free trial.
 */
export function getRemainingTrialDays(
  trialEndsAt?: string | null,
  referenceDate: Date = new Date(),
  createdAt?: string | null
): number {
  if (trialEndsAt) {
    const diffMs = new Date(trialEndsAt).getTime() - referenceDate.getTime()
    if (diffMs <= 0) return 0
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  }
  if (createdAt) {
    const trialEndTime = new Date(createdAt).getTime() + 14 * 24 * 60 * 60 * 1000
    const diffMs = trialEndTime - referenceDate.getTime()
    if (diffMs <= 0) return 0
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  }
  // Default fallback for fresh workspaces without explicit DB timestamps
  return 14
}

/**
 * Resolves full real-time subscription status and plan configuration.
 */
export function getEffectiveSubscription(
  org?: SubscriptionOrgData | null,
  referenceDate: Date = new Date()
): EffectiveSubscription {
  const rawTier = (org?.plan_tier || 'growth').toLowerCase() as PlanTier
  const planTier: PlanTier = PLAN_CONFIGS[rawTier] ? rawTier : 'growth'
  const planConfig = PLAN_CONFIGS[planTier]

  const rawStatus = (org?.subscription_status || 'trialing').toLowerCase() as SubscriptionStatus
  let isActive = isSubscriptionActive(org, referenceDate)
  let isTrialing = rawStatus === 'trialing' && isActive

  const trialDaysRemaining = isTrialing
    ? getRemainingTrialDays(org?.trial_ends_at, referenceDate, org?.created_at)
    : 0

  // If trialing state has 0 days remaining, subscription is expired
  if (isTrialing && trialDaysRemaining <= 0) {
    isActive = false
    isTrialing = false
  }

  const isExpired = !isActive

  const effectiveStatus: SubscriptionStatus = isTrialing
    ? 'trialing'
    : isActive
    ? 'active'
    : 'expired'

  const maxActiveSites = org?.max_active_sites || planConfig.maxActiveSites

  return {
    planTier,
    effectiveStatus,
    isActive,
    isTrialing,
    isExpired,
    trialDaysRemaining,
    maxActiveSites,
    planConfig,
  }
}

/**
 * Checks if the organization can create another active project package.
 */
export function canCreateActiveSite(
  currentActiveSiteCount: number,
  maxAllowedSites: number,
  isSubscriptionActiveState: boolean
): { allowed: boolean; reason?: string } {
  if (!isSubscriptionActiveState) {
    return {
      allowed: false,
      reason: 'Your subscription has ended. Workspace is currently in Read-Only mode. Please reactivate your plan to create new sites.',
    }
  }

  if (currentActiveSiteCount >= maxAllowedSites) {
    return {
      allowed: false,
      reason: `You have reached your active site limit (${currentActiveSiteCount}/${maxAllowedSites}). Archive a completed project or upgrade your plan to create additional active packages.`,
    }
  }

  return { allowed: true }
}

/**
 * Granular feature gate check.
 */
export function canAccessFeature(
  feature: keyof Pick<
    PlanConfig,
    'hasForm26MB' | 'hasDelayDefense' | 'hasPartnerEquity' | 'hasForm27Dossier' | 'hasTallySync'
  >,
  org?: SubscriptionOrgData | null,
  referenceDate: Date = new Date()
): { allowed: boolean; requiredPlan: PlanTier; reason?: string } {
  const sub = getEffectiveSubscription(org, referenceDate)

  if (!sub.isActive) {
    return {
      allowed: false,
      requiredPlan: sub.planTier,
      reason: 'Subscription expired. Workspace is in Read-Only mode.',
    }
  }

  const isFeatureAllowed = sub.planConfig[feature]
  if (!isFeatureAllowed) {
    const requiredPlan: PlanTier =
      feature === 'hasForm27Dossier' ? 'enterprise' : 'growth'
    return {
      allowed: false,
      requiredPlan,
      reason: `This feature requires the ${PLAN_CONFIGS[requiredPlan].name} plan.`,
    }
  }

  return {
    allowed: true,
    requiredPlan: sub.planTier,
  }
}

