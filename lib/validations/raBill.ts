import { z } from 'zod'

/**
 * Validation schema for submitting an RA Bill
 */
export const createRABillSchema = z.object({
  project_id: z.string().uuid('Please select a valid civil project.'),
  bill_number: z.string().trim().min(1, 'RA Bill Number (e.g. RA-01 or 1st & Final) is required.').max(100),
  bill_type: z.enum(['running', 'first_and_final', 'final']).default('running'),
  submission_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid submission date (YYYY-MM-DD) is required.'),
  billing_mode: z.enum(['standalone', 'cumulative']),
  previous_bill_id: z.string().uuid().optional().or(z.literal('')),
  work_certified_amount: z.coerce
    .number()
    .positive('Work certified amount must be greater than ₹0.'),
  retention_percentage: z.coerce
    .number()
    .min(0, 'Retention percentage cannot be negative.')
    .max(25, 'Retention percentage typically does not exceed 25%.')
    .default(5.0),
  // CPWA Code Form 23 & 26 Citation & Recovery Fields
  mb_number: z.string().trim().max(100).optional().or(z.literal('')),
  mb_page_start: z.coerce.number().int().min(1).optional().nullable(),
  mb_page_end: z.coerce.number().int().min(1).optional().nullable(),
  measurement_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  measuring_officer_name: z.string().trim().max(100).optional().or(z.literal('')),
  measuring_officer_designation: z.string().trim().max(50).optional().default('Junior Engineer'),
  advance_payments_unmeasured: z.coerce.number().min(0).optional().default(0),
  cement_recovery: z.coerce.number().min(0).optional().default(0),
  steel_recovery: z.coerce.number().min(0).optional().default(0),
  other_material_recovery: z.coerce.number().min(0).optional().default(0),
  actual_completion_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  dlp_months: z.coerce.number().int().min(0).max(60).optional().default(12),
  remarks: z.string().trim().max(500).optional().or(z.literal('')),
})

export type CreateRABillInput = z.infer<typeof createRABillSchema>

/**
 * Validation schema for an individual itemized departmental deduction
 */
export const billDeductionItemSchema = z.object({
  id: z.string().optional(),
  label: z.string().trim().min(1, 'Deduction name is required (e.g. Royalty, Penalty).'),
  amount: z.coerce.number().min(0, 'Deduction amount cannot be negative.'),
})

/**
 * Validation schema for recording a treasury bill payment installment
 */
export const recordPaymentSchema = z.object({
  bill_id: z.string().uuid('Please select a valid RA Bill.'),
  gross_amount: z.coerce
    .number()
    .positive('Gross amount released must be greater than ₹0.'),
  tds_amount: z.coerce.number().min(0, 'IT TDS cannot be negative.').default(0),
  gst_tds_amount: z.coerce.number().min(0, 'GST TDS cannot be negative.').default(0),
  labour_cess_amount: z.coerce.number().min(0, 'Labour Cess cannot be negative.').default(0),
  other_deductions: z.coerce.number().min(0, 'Other deductions cannot be negative.').default(0),
  date_received: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid payment date (YYYY-MM-DD) is required.'),
  reference: z.string().trim().max(100).optional().or(z.literal('')),
  remarks: z.string().trim().max(500).optional().or(z.literal('')),
  additional_deductions: z.array(billDeductionItemSchema).optional(),
})

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>

/**
 * Validation schema for Bank Guarantees, EMDs, and Security Deposits
 */
export const securityDepositSchema = z.object({
  project_id: z.string().uuid('Please select a valid civil project.'),
  deposit_type: z.enum([
    'performance_bank_guarantee',
    'security_deposit',
    'earnest_money_deposit',
    'fixed_deposit_receipt',
    'additional_performance_security',
    'additional_security_deposit',
    'other',
  ]),
  reference_number: z.string().trim().min(1, 'Reference / Guarantee Number is required.').max(100),
  issuing_bank: z.string().trim().max(100).optional().or(z.literal('')),
  amount: z.coerce
    .number()
    .positive('Guarantee amount must be greater than ₹0.'),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid issue date (YYYY-MM-DD) is required.').optional().or(z.literal('')),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid expiry date (YYYY-MM-DD) is required for BG tracking.'),
  claim_expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid claim expiry date is required.').optional().or(z.literal('')),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
})

export type SecurityDepositInput = z.infer<typeof securityDepositSchema>

