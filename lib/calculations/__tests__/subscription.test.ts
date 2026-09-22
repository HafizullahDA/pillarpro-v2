import { describe, it, expect } from 'vitest'
import {
  isSubscriptionActive,
  getRemainingTrialDays,
  getEffectiveSubscription,
  canCreateActiveSite,
  canAccessFeature,
} from '../../subscription'

describe('Subscription & Entitlement Engine', () => {
  const referenceNow = new Date('2026-09-21T12:00:00Z')

  describe('isSubscriptionActive', () => {
    it('returns true when trial_ends_at is in the future', () => {
      const org = {
        subscription_status: 'trialing',
        trial_ends_at: '2026-10-05T12:00:00Z', // 14 days later
      }
      expect(isSubscriptionActive(org, referenceNow)).toBe(true)
    })

    it('returns false when trial_ends_at has passed', () => {
      const org = {
        subscription_status: 'trialing',
        trial_ends_at: '2026-09-20T12:00:00Z', // 1 day ago
      }
      expect(isSubscriptionActive(org, referenceNow)).toBe(false)
    })

    it('returns true when paid subscription current_period_end is in the future', () => {
      const org = {
        subscription_status: 'active',
        current_period_end: '2026-10-21T12:00:00Z',
      }
      expect(isSubscriptionActive(org, referenceNow)).toBe(true)
    })

    it('returns false when paid subscription current_period_end has passed without renewal', () => {
      const org = {
        subscription_status: 'active',
        current_period_end: '2026-09-21T11:00:00Z', // 1 hour ago
      }
      expect(isSubscriptionActive(org, referenceNow)).toBe(false)
    })

    it('returns false for canceled or expired status', () => {
      expect(isSubscriptionActive({ subscription_status: 'expired' }, referenceNow)).toBe(false)
      expect(isSubscriptionActive({ subscription_status: 'canceled' }, referenceNow)).toBe(false)
      expect(isSubscriptionActive(null, referenceNow)).toBe(false)
    })
  })

  describe('getRemainingTrialDays', () => {
    it('accurately computes remaining days', () => {
      expect(getRemainingTrialDays('2026-09-26T12:00:00Z', referenceNow)).toBe(5)
      expect(getRemainingTrialDays('2026-09-21T12:00:00Z', referenceNow)).toBe(0)
      expect(getRemainingTrialDays('2026-09-15T12:00:00Z', referenceNow)).toBe(0)
    })

    it('falls back to 14 days when no timestamp is set', () => {
      expect(getRemainingTrialDays(null, referenceNow)).toBe(14)
      expect(getRemainingTrialDays(undefined, referenceNow)).toBe(14)
    })

    it('computes 14 days from created_at if trial_ends_at is missing', () => {
      // 4 days after creation = 10 days remaining
      const createdAt = '2026-09-17T12:00:00Z'
      expect(getRemainingTrialDays(null, referenceNow, createdAt)).toBe(10)
    })
  })

  describe('getEffectiveSubscription', () => {
    it('correctly maps Growth plan with active trial', () => {
      const org = {
        plan_tier: 'growth',
        subscription_status: 'trialing',
        trial_ends_at: '2026-09-30T12:00:00Z',
      }
      const sub = getEffectiveSubscription(org, referenceNow)
      expect(sub.isActive).toBe(true)
      expect(sub.isTrialing).toBe(true)
      expect(sub.effectiveStatus).toBe('trialing')
      expect(sub.maxActiveSites).toBe(6)
      expect(sub.planConfig.hasDelayDefense).toBe(true)
    })

    it('identifies lapsed subscription as expired read-only', () => {
      const org = {
        plan_tier: 'bootstrap',
        subscription_status: 'active',
        current_period_end: '2026-09-15T12:00:00Z',
      }
      const sub = getEffectiveSubscription(org, referenceNow)
      expect(sub.isActive).toBe(false)
      expect(sub.isExpired).toBe(true)
      expect(sub.effectiveStatus).toBe('expired')
    })
  })

  describe('canCreateActiveSite', () => {
    it('allows site creation within quota when active', () => {
      const check = canCreateActiveSite(3, 6, true)
      expect(check.allowed).toBe(true)
    })

    it('blocks site creation when quota reached', () => {
      const check = canCreateActiveSite(6, 6, true)
      expect(check.allowed).toBe(false)
      expect(check.reason).toContain('reached your active site limit')
    })

    it('blocks site creation when subscription expired even with empty quota', () => {
      const check = canCreateActiveSite(0, 6, false)
      expect(check.allowed).toBe(false)
      expect(check.reason).toContain('Read-Only mode')
    })
  })

  describe('canAccessFeature', () => {
    it('restricts Form 26 MB on Bootstrap tier', () => {
      const org = {
        plan_tier: 'bootstrap',
        subscription_status: 'trialing',
        trial_ends_at: '2026-10-01T12:00:00Z',
      }
      const check = canAccessFeature('hasForm26MB', org, referenceNow)
      expect(check.allowed).toBe(false)
      expect(check.requiredPlan).toBe('growth')
    })

    it('permits Delay Defense on Growth tier', () => {
      const org = {
        plan_tier: 'growth',
        subscription_status: 'trialing',
        trial_ends_at: '2026-10-01T12:00:00Z',
      }
      const check = canAccessFeature('hasDelayDefense', org, referenceNow)
      expect(check.allowed).toBe(true)
    })

    it('requires Enterprise for Form 27 Dossier', () => {
      const growthOrg = {
        plan_tier: 'growth',
        subscription_status: 'trialing',
        trial_ends_at: '2026-10-01T12:00:00Z',
      }
      const checkGrowth = canAccessFeature('hasForm27Dossier', growthOrg, referenceNow)
      expect(checkGrowth.allowed).toBe(false)
      expect(checkGrowth.requiredPlan).toBe('enterprise')

      const enterpriseOrg = {
        plan_tier: 'enterprise',
        subscription_status: 'trialing',
        trial_ends_at: '2026-10-01T12:00:00Z',
      }
      const checkEnterprise = canAccessFeature('hasForm27Dossier', enterpriseOrg, referenceNow)
      expect(checkEnterprise.allowed).toBe(true)
    })
  })
})
