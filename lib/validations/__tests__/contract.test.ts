import { describe, it, expect } from 'vitest'
import { contractSchema, contractDocumentSchema } from '../contract'

describe('Contract Master Zod Validations', () => {
  it('validates a complete, compliant government contract record', () => {
    const validData = {
      employer_name: 'Executive Engineer, R&B Division Baramulla',
      division: 'Baramulla',
      circle: 'North Kashmir Circle',
      contracting_authority: 'Executive Engineer',
      contractor_name: 'M/s Horizon Builders & Infra',

      agreement_number: '04/EE/R&B/2025-26',
      work_order_number: 'WO/PWD/1140/2025',
      nit_number: 'e-NIT No. 12 of 2025-26',
      contract_title: 'Widening of National Highway Link Road Km 0 to 8',

      contract_type: 'Item Rate',
      tender_type: 'Open Tender',

      estimated_cost: 15000000,
      awarded_amount: 13500000,

      award_date: '2025-04-10',
      agreement_date: '2025-04-20',
      work_commencement_date: '2025-05-01',
      original_completion_date: '2026-04-30',
      current_completion_date: '2026-06-30',
      original_contract_period_months: 12,

      dlp_months: 12,
      dlp_start_date: '2026-07-01',
      dlp_end_date: '2027-06-30',

      earnest_money_deposit: 300000,
      performance_security_amount: 675000,
      performance_security_percent: 5,
      security_deposit_amount: 337500,
      security_deposit_percent: 2.5,
      retention_percentage: 5,

      contractor_gstin: '01AAAAA0000A1Z5',
      employer_gstin: '01PWDDEPT1234Z0',
      gst_rate_percent: 18,
      gst_treatment: 'exclusive',

      liquidated_damages_percent_per_week: 0.5,
      liquidated_damages_max_cap_percent: 10,
      ld_provisions_notes: 'As per Clause 2 CPWD GCC',

      eot_clause: 'Clause 5 CPWD / PWD GCC',
      eot_notice_days: 14,
      eot_provisions_notes: '14-day statutory notice is mandatory',

      escalation_applicable: true,
      escalation_clause: 'Clause 10CC',

      variation_limit_percent: 25,
      variation_clause: 'Clause 12',

      payment_terms_frequency: 'monthly',
      gcc_type: 'CPWD GCC 2020 / 2024',
      status: 'active',
    }

    const result = contractSchema.safeParse(validData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.agreement_number).toBe('04/EE/R&B/2025-26')
      expect(result.data.awarded_amount).toBe(13500000)
      expect(result.data.retention_percentage).toBe(5)
    }
  })

  it('rejects when original completion date is before commencement date', () => {
    const invalidDates = {
      employer_name: 'NHAI PIU Jammu',
      contractor_name: 'M/s Infra Corp',
      agreement_number: 'AGR-101',
      awarded_amount: 5000000,
      work_commencement_date: '2025-05-01',
      original_completion_date: '2025-04-01', // Invalid: before commencement
    }

    const result = contractSchema.safeParse(invalidDates)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('Original Completion Date must be on or after Work Commencement Date')
    }
  })

  it('rejects negative contract values and negative retention percentages', () => {
    const negativeData = {
      employer_name: 'CPWD Division',
      contractor_name: 'M/s ABC',
      agreement_number: 'AGR-202',
      awarded_amount: -5000, // Invalid: negative
      retention_percentage: 150, // Invalid: > 100%
    }

    const result = contractSchema.safeParse(negativeData)
    expect(result.success).toBe(false)
  })

  it('validates contract document metadata', () => {
    const validDoc = {
      document_type: 'Agreement',
      title: 'Formal Contract Agreement Copy',
      document_number: 'AGR/2025/04',
      issue_date: '2025-04-20',
      file_url: 'https://storage.pillarpro.com/contracts/doc_123.pdf',
      file_name: 'Agreement_Signed.pdf',
      file_size_bytes: 2048500,
      file_type: 'application/pdf',
      notes: 'Signed in front of Superintending Engineer',
    }

    const result = contractDocumentSchema.safeParse(validDoc)
    expect(result.success).toBe(true)
  })

  it('rejects unsupported contract document types', () => {
    const invalidDoc = {
      document_type: 'RandomUnknownType',
      title: 'Invalid Doc',
      file_url: 'https://example.com/file.pdf',
    }

    const result = contractDocumentSchema.safeParse(invalidDoc)
    expect(result.success).toBe(false)
  })
})
