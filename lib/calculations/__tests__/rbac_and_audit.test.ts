import { describe, it, expect } from 'vitest'
import {
  can,
  normalizeRole,
  formatRoleLabel,
  ROLES_CONFIG,
  canCertifyMeasurement,
  canApproveBOQ,
  canSubmitRABill,
  canRecordPayment,
  canSubmitClaim,
  canAmendContract,
  canSubmitEOT,
  canApproveVariation,
  CanonicalRole,
} from '../../permissions'
import { computeFieldDiff, formatAuditAction } from '../../audit'

describe('Role-Based Access Control (RBAC) System', () => {
  const allTenRoles: CanonicalRole[] = [
    'owner',
    'partner',
    'project_manager',
    'billing_engineer',
    'site_engineer',
    'accountant',
    'store_manager',
    'site_supervisor',
    'data_entry',
    'viewer',
  ]

  it('recognizes and configures all 10 standard contractor roles', () => {
    expect(ROLES_CONFIG.length).toBe(10)
    const configuredRoleIds = ROLES_CONFIG.map(r => r.id)
    allTenRoles.forEach(role => {
      expect(configuredRoleIds).toContain(role)
    })
  })

  it('normalizes roles and backward-compatible aliases properly', () => {
    expect(normalizeRole('owner')).toBe('owner')
    expect(normalizeRole('managing_partner')).toBe('partner')
    expect(normalizeRole('partner')).toBe('partner')
    expect(normalizeRole('project_manager')).toBe('project_manager')
    expect(normalizeRole('PM')).toBe('project_manager')
    expect(normalizeRole('billing_engineer')).toBe('billing_engineer')
    expect(normalizeRole('QS')).toBe('billing_engineer')
    expect(normalizeRole('site_engineer')).toBe('site_engineer')
    expect(normalizeRole('accountant')).toBe('accountant')
    expect(normalizeRole('store_manager')).toBe('store_manager')
    expect(normalizeRole('storekeeper')).toBe('store_manager')
    expect(normalizeRole('site_supervisor')).toBe('site_supervisor')
    expect(normalizeRole('data_entry')).toBe('data_entry')
    expect(normalizeRole('viewer')).toBe('viewer')
    expect(normalizeRole('auditor')).toBe('viewer')
    expect(normalizeRole(null)).toBeNull()
    expect(normalizeRole('invalid_role')).toBeNull()
  })

  it('formats clean human-readable labels for all 10 roles', () => {
    expect(formatRoleLabel('owner')).toBe('Owner')
    expect(formatRoleLabel('partner')).toBe('Partner')
    expect(formatRoleLabel('project_manager')).toBe('Project Manager')
    expect(formatRoleLabel('billing_engineer')).toBe('Billing Engineer')
    expect(formatRoleLabel('site_engineer')).toBe('Site Engineer')
    expect(formatRoleLabel('accountant')).toBe('Accountant')
    expect(formatRoleLabel('store_manager')).toBe('Store Manager')
    expect(formatRoleLabel('site_supervisor')).toBe('Site Supervisor')
    expect(formatRoleLabel('data_entry')).toBe('Data Entry Operator')
    expect(formatRoleLabel('viewer')).toBe('Viewer / Auditor')
  })

  describe('Protection of High-Stakes Actions', () => {
    it('protects certified measurements: only Billing Engineer, PM, Partner, and Owner can certify', () => {
      expect(canCertifyMeasurement('owner')).toBe(true)
      expect(canCertifyMeasurement('partner')).toBe(true)
      expect(canCertifyMeasurement('project_manager')).toBe(true)
      expect(canCertifyMeasurement('billing_engineer')).toBe(true)

      // Forbidden for field execution, clerks, and viewers
      expect(canCertifyMeasurement('site_engineer')).toBe(false)
      expect(canCertifyMeasurement('site_supervisor')).toBe(false)
      expect(canCertifyMeasurement('data_entry')).toBe(false)
      expect(canCertifyMeasurement('store_manager')).toBe(false)
      expect(canCertifyMeasurement('accountant')).toBe(false)
      expect(canCertifyMeasurement('viewer')).toBe(false)
    })

    it('protects BOQ approval: only PM, Partner, and Owner can approve revisions', () => {
      expect(canApproveBOQ('owner')).toBe(true)
      expect(canApproveBOQ('partner')).toBe(true)
      expect(canApproveBOQ('project_manager')).toBe(true)

      expect(canApproveBOQ('billing_engineer')).toBe(false) // Can create/edit, not approve
      expect(canApproveBOQ('site_engineer')).toBe(false)
      expect(canApproveBOQ('site_supervisor')).toBe(false)
      expect(canApproveBOQ('data_entry')).toBe(false)
      expect(canApproveBOQ('accountant')).toBe(false)
      expect(canApproveBOQ('viewer')).toBe(false)
    })

    it('protects RA Bill submission: only Billing Engineer, PM, Partner, and Owner can submit to department', () => {
      expect(canSubmitRABill('owner')).toBe(true)
      expect(canSubmitRABill('partner')).toBe(true)
      expect(canSubmitRABill('project_manager')).toBe(true)
      expect(canSubmitRABill('billing_engineer')).toBe(true)

      expect(canSubmitRABill('site_engineer')).toBe(false)
      expect(canSubmitRABill('site_supervisor')).toBe(false)
      expect(canSubmitRABill('accountant')).toBe(false)
      expect(canSubmitRABill('data_entry')).toBe(false)
      expect(canSubmitRABill('viewer')).toBe(false)
    })

    it('protects payment disbursements: only Accountant, Partner, and Owner can record bank credits/payouts', () => {
      expect(canRecordPayment('owner')).toBe(true)
      expect(canRecordPayment('partner')).toBe(true)
      expect(canRecordPayment('accountant')).toBe(true)

      expect(canRecordPayment('project_manager')).toBe(false)
      expect(canRecordPayment('billing_engineer')).toBe(false)
      expect(canRecordPayment('site_engineer')).toBe(false)
      expect(canRecordPayment('site_supervisor')).toBe(false)
      expect(canRecordPayment('data_entry')).toBe(false)
      expect(canRecordPayment('viewer')).toBe(false)
    })

    it('protects claims & disputes: only Billing Engineer, PM, Partner, and Owner can submit official claims', () => {
      expect(canSubmitClaim('owner')).toBe(true)
      expect(canSubmitClaim('partner')).toBe(true)
      expect(canSubmitClaim('project_manager')).toBe(true)
      expect(canSubmitClaim('billing_engineer')).toBe(true)

      expect(canSubmitClaim('site_engineer')).toBe(false)
      expect(canSubmitClaim('site_supervisor')).toBe(false)
      expect(canSubmitClaim('accountant')).toBe(false)
      expect(canSubmitClaim('data_entry')).toBe(false)
      expect(canSubmitClaim('viewer')).toBe(false)
    })

    it('protects contract amendments and milestones: only PM, Partner, and Owner can amend contract parameters', () => {
      expect(canAmendContract('owner')).toBe(true)
      expect(canAmendContract('partner')).toBe(true)
      expect(canAmendContract('project_manager')).toBe(true)

      expect(canAmendContract('billing_engineer')).toBe(false)
      expect(canAmendContract('site_engineer')).toBe(false)
      expect(canAmendContract('accountant')).toBe(false)
      expect(canAmendContract('site_supervisor')).toBe(false)
      expect(canAmendContract('data_entry')).toBe(false)
      expect(canAmendContract('viewer')).toBe(false)
    })

    it('protects EOT submissions: only Billing Engineer, PM, Partner, and Owner can submit time extensions', () => {
      expect(canSubmitEOT('owner')).toBe(true)
      expect(canSubmitEOT('partner')).toBe(true)
      expect(canSubmitEOT('project_manager')).toBe(true)
      expect(canSubmitEOT('billing_engineer')).toBe(true)

      expect(canSubmitEOT('site_engineer')).toBe(false)
      expect(canSubmitEOT('site_supervisor')).toBe(false)
      expect(canSubmitEOT('accountant')).toBe(false)
      expect(canSubmitEOT('viewer')).toBe(false)
    })

    it('protects variation order approvals: only Partner and Owner can approve financial variation limits', () => {
      expect(canApproveVariation('owner')).toBe(true)
      expect(canApproveVariation('partner')).toBe(true)

      expect(canApproveVariation('project_manager')).toBe(false) // Can submit, not approve
      expect(canApproveVariation('billing_engineer')).toBe(false)
      expect(canApproveVariation('site_engineer')).toBe(false)
      expect(canApproveVariation('site_supervisor')).toBe(false)
      expect(canApproveVariation('viewer')).toBe(false)
    })

    it('enforces read-only viewer role: viewer cannot perform any mutations', () => {
      const mutationActions = ['create', 'edit', 'delete', 'certify', 'approve', 'submit', 'manage'] as const
      const sampleModules = ['projects', 'contracts', 'boq', 'measurement', 'ra_bills', 'payments', 'expenses'] as const

      sampleModules.forEach(mod => {
        expect(can('viewer', mod, 'view')).toBe(true)
        mutationActions.forEach(action => {
          expect(can('viewer', mod, action)).toBe(false)
        })
      })
    })
  })
})

describe('Immutable Audit Trail Utilities', () => {
  it('correctly computes field diffs between previous and new states', () => {
    const prev = {
      status: 'SUBMITTED',
      calculated_quantity: 45.5,
      rate: 1200,
      updated_at: '2026-09-01T00:00:00Z',
    }
    const next = {
      status: 'CERTIFIED',
      calculated_quantity: 48.0,
      rate: 1200, // unchanged
      updated_at: '2026-09-29T10:00:00Z', // ignored timestamp
    }

    const diff = computeFieldDiff(prev, next)
    expect(diff).toEqual({
      status: { from: 'SUBMITTED', to: 'CERTIFIED' },
      calculated_quantity: { from: 45.5, to: 48.0 },
    })
  })

  it('formats audit actions with designated styling and badge variants', () => {
    expect(formatAuditAction('MEASUREMENT_CERTIFIED')).toEqual({
      label: 'Measurement Certified',
      color: 'emerald',
      badgeVariant: 'success',
    })
    expect(formatAuditAction('BOQ_QUANTITY_CHANGED')).toEqual({
      label: 'BOQ Quantity Changed',
      color: 'blue',
      badgeVariant: 'info',
    })
    expect(formatAuditAction('CLAIM_SUBMITTED')).toEqual({
      label: 'Claim Submitted',
      color: 'rose',
      badgeVariant: 'danger',
    })
    expect(formatAuditAction('PAYMENT_RECORDED')).toEqual({
      label: 'Payment Recorded',
      color: 'indigo',
      badgeVariant: 'success',
    })
    expect(formatAuditAction('CONTRACT_DATE_CHANGED')).toEqual({
      label: 'Contract Date/Value Changed',
      color: 'orange',
      badgeVariant: 'warning',
    })
  })
})
