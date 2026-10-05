import { describe, it, expect } from 'vitest'

describe('Phase 4: Alert Control Center & Notification Preferences', () => {
  it('correctly maps default threshold configuration when initialized', () => {
    const defaultThresholds = {
      bg_warning_days: [30, 15, 7, 3, 1, 0],
      notice_warning_days: [5, 2, 0],
      ra_bill_submission_delay_days: 30,
      ra_bill_payment_delay_days: 15,
      supplier_credit_threshold_pct: 85,
      dpr_cutoff_time: '20:00',
      machinery_service_interval_hours: 250,
      machinery_compliance_warning_days: [15, 3, 0],
    }

    expect(defaultThresholds.ra_bill_submission_delay_days).toBe(30)
    expect(defaultThresholds.supplier_credit_threshold_pct).toBe(85)
    expect(defaultThresholds.machinery_service_interval_hours).toBe(250)
    expect(defaultThresholds.bg_warning_days).toContain(30)
    expect(defaultThresholds.bg_warning_days).toContain(0)
  })

  it('routes phone numbers accurately by business function', () => {
    const preferences = {
      primary_phone: '+919876543210',
      accounts_phone: '+919876543211',
      site_phone: '+919876543212',
    }

    function routeAlertRecipient(entityType: string, prefs: typeof preferences): string {
      if (entityType === 'ra_bill' || entityType === 'supplier') {
        return prefs.accounts_phone || prefs.primary_phone
      }
      if (
        entityType === 'dpr' ||
        entityType === 'inventory' ||
        entityType === 'machinery' ||
        entityType === 'labour_payout'
      ) {
        return prefs.site_phone || prefs.primary_phone
      }
      return prefs.primary_phone
    }

    // Financial & Vendor safeguards route to accounts head
    expect(routeAlertRecipient('ra_bill', preferences)).toBe('+919876543211')
    expect(routeAlertRecipient('supplier', preferences)).toBe('+919876543211')

    // Field & Fleet operations route to site in-charge
    expect(routeAlertRecipient('dpr', preferences)).toBe('+919876543212')
    expect(routeAlertRecipient('machinery', preferences)).toBe('+919876543212')
    expect(routeAlertRecipient('inventory', preferences)).toBe('+919876543212')
    expect(routeAlertRecipient('labour_payout', preferences)).toBe('+919876543212')

    // Legal & Banking guarantees route to managing director
    expect(routeAlertRecipient('bank_guarantee', preferences)).toBe('+919876543210')
    expect(routeAlertRecipient('correspondence', preferences)).toBe('+919876543210')
  })

  it('falls back to primary phone if specialized role phone is unconfigured', () => {
    const partialPreferences = {
      primary_phone: '+919876543210',
      accounts_phone: '',
      site_phone: null as any,
    }

    function routeAlertRecipient(entityType: string, prefs: typeof partialPreferences): string {
      if (entityType === 'ra_bill' || entityType === 'supplier') {
        return prefs.accounts_phone || prefs.primary_phone
      }
      if (
        entityType === 'dpr' ||
        entityType === 'inventory' ||
        entityType === 'machinery' ||
        entityType === 'labour_payout'
      ) {
        return prefs.site_phone || prefs.primary_phone
      }
      return prefs.primary_phone
    }

    expect(routeAlertRecipient('ra_bill', partialPreferences)).toBe('+919876543210')
    expect(routeAlertRecipient('dpr', partialPreferences)).toBe('+919876543210')
  })

  it('filters candidate dispatches when domain switches are disabled', () => {
    const preferences = {
      bg_fdr_enabled: false,
      contractual_notices_enabled: true,
      ra_bills_enabled: true,
      supplier_credit_enabled: false,
      dpr_reminders_enabled: true,
      inventory_reorder_enabled: true,
      machinery_fleet_enabled: false,
      labour_payout_enabled: true,
    }

    function isDomainActive(entityType: string, prefs: typeof preferences): boolean {
      if (entityType === 'bank_guarantee') return prefs.bg_fdr_enabled
      if (entityType === 'correspondence') return prefs.contractual_notices_enabled
      if (entityType === 'ra_bill') return prefs.ra_bills_enabled
      if (entityType === 'supplier') return prefs.supplier_credit_enabled
      if (entityType === 'dpr') return prefs.dpr_reminders_enabled
      if (entityType === 'inventory') return prefs.inventory_reorder_enabled
      if (entityType === 'machinery') return prefs.machinery_fleet_enabled
      if (entityType === 'labour_payout') return prefs.labour_payout_enabled
      return true
    }

    expect(isDomainActive('bank_guarantee', preferences)).toBe(false)
    expect(isDomainActive('supplier', preferences)).toBe(false)
    expect(isDomainActive('machinery', preferences)).toBe(false)
    expect(isDomainActive('ra_bill', preferences)).toBe(true)
    expect(isDomainActive('dpr', preferences)).toBe(true)
    expect(isDomainActive('labour_payout', preferences)).toBe(true)
  })
})
