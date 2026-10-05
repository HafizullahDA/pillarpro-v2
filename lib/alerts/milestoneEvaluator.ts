/**
 * Milestone Evaluator
 * Maps contractual / statutory target dates to standardized urgency milestone buckets.
 * Uses resilient brackets so weekend gaps or missed scans never drop critical alerts.
 */

import { MilestoneKey } from './types'

export interface MilestoneEvaluation {
  daysRemaining: number
  milestoneKey: MilestoneKey | null
  urgencyLabel: string
}

/**
 * Calculates days remaining and determines if an alert milestone should fire.
 *
 * Brackets:
 * - T_MINUS_30: 16 to 30 days remaining
 * - T_MINUS_15: 8 to 15 days remaining
 * - T_MINUS_7:  4 to 7 days remaining (Critical)
 * - T_MINUS_3:  2 to 3 days remaining (Urgent Escalation)
 * - T_MINUS_1:  1 day remaining (Final Warning)
 * - T_0:        0 days remaining (Due Today / Expiry Day)
 * - OVERDUE:    1 to 7 days past due (Expired / Default Risk)
 */
export function evaluateMilestone(
  targetDateStr: string,
  asOfDateStr?: string
): MilestoneEvaluation {
  if (!targetDateStr) {
    return { daysRemaining: 0, milestoneKey: null, urgencyLabel: 'NO_DATE' }
  }

  const targetDate = new Date(targetDateStr)
  if (isNaN(targetDate.getTime())) {
    return { daysRemaining: 0, milestoneKey: null, urgencyLabel: 'INVALID_DATE' }
  }

  const today = asOfDateStr ? new Date(asOfDateStr) : new Date()
  today.setHours(0, 0, 0, 0)
  targetDate.setHours(0, 0, 0, 0)

  const diffMs = targetDate.getTime() - today.getTime()
  const daysRemaining = Math.round(diffMs / (24 * 60 * 60 * 1000))

  let milestoneKey: MilestoneKey | null = null
  let urgencyLabel = ''

  if (daysRemaining > 30) {
    // Too far in future for active alert
    milestoneKey = null
    urgencyLabel = `${daysRemaining}d REMAINING (SCHEDULED)`
  } else if (daysRemaining > 15 && daysRemaining <= 30) {
    milestoneKey = 'T_MINUS_30'
    urgencyLabel = `${daysRemaining}d REMAINING (30-DAY NOTICE)`
  } else if (daysRemaining > 7 && daysRemaining <= 15) {
    milestoneKey = 'T_MINUS_15'
    urgencyLabel = `${daysRemaining}d REMAINING (15-DAY URGENT)`
  } else if (daysRemaining > 3 && daysRemaining <= 7) {
    milestoneKey = 'T_MINUS_7'
    urgencyLabel = `${daysRemaining}d REMAINING (CRITICAL 7-DAY ALERT)`
  } else if (daysRemaining > 1 && daysRemaining <= 3) {
    milestoneKey = 'T_MINUS_3'
    urgencyLabel = `${daysRemaining}d REMAINING (EMERGENCY 3-DAY ALERT)`
  } else if (daysRemaining === 1) {
    milestoneKey = 'T_MINUS_1'
    urgencyLabel = 'DUE TOMORROW (1-DAY EMERGENCY)'
  } else if (daysRemaining === 0) {
    milestoneKey = 'T_0'
    urgencyLabel = 'DUE TODAY (IMMEDIATE ACTION REQUIRED)'
  } else if (daysRemaining < 0 && daysRemaining >= -7) {
    milestoneKey = 'OVERDUE'
    urgencyLabel = `${Math.abs(daysRemaining)}d OVERDUE (EXPIRED)`
  } else {
    // Overdue by more than 7 days — already escalated
    milestoneKey = null
    urgencyLabel = `${Math.abs(daysRemaining)}d OVERDUE`
  }

  return { daysRemaining, milestoneKey, urgencyLabel }
}
