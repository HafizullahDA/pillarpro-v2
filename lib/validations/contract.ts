import { z } from 'zod'

export const contractSchema = z
  .object({
    employer_name: z.string().min(1, 'Employer / Department name is required'),
    division: z.string().optional().nullable(),
    circle: z.string().optional().nullable(),
    contracting_authority: z.string().optional().nullable(),
    contractor_name: z.string().min(1, 'Contractor name is required'),

    agreement_number: z.string().min(1, 'Agreement number is required'),
    work_order_number: z.string().optional().nullable(),
    nit_number: z.string().optional().nullable(),
    contract_title: z.string().optional().nullable(),

    contract_type: z.string().default('Item Rate'),
    tender_type: z.string().default('Open Tender'),

    estimated_cost: z.coerce.number().min(0, 'Estimated cost cannot be negative').default(0),
    awarded_amount: z.coerce.number().min(0, 'Awarded contract value cannot be negative'),

    award_date: z.string().optional().nullable(),
    agreement_date: z.string().optional().nullable(),
    work_commencement_date: z.string().optional().nullable(),
    original_completion_date: z.string().optional().nullable(),
    current_completion_date: z.string().optional().nullable(),
    original_contract_period_months: z.coerce.number().min(0).optional().nullable(),
    original_contract_period_days: z.coerce.number().int().min(0).optional().nullable(),

    dlp_months: z.coerce.number().int().min(0).default(12),
    dlp_start_date: z.string().optional().nullable(),
    dlp_end_date: z.string().optional().nullable(),

    earnest_money_deposit: z.coerce.number().min(0).default(0),
    performance_security_amount: z.coerce.number().min(0).default(0),
    performance_security_percent: z.coerce.number().min(0).max(100).default(5),
    security_deposit_amount: z.coerce.number().min(0).default(0),
    security_deposit_percent: z.coerce.number().min(0).max(100).default(2.5),
    retention_percentage: z.coerce.number().min(0).max(100).default(5),

    contractor_gstin: z.string().optional().nullable(),
    employer_gstin: z.string().optional().nullable(),
    gst_rate_percent: z.coerce.number().min(0).max(100).default(18),
    gst_treatment: z.enum(['inclusive', 'exclusive']).default('exclusive'),

    liquidated_damages_percent_per_week: z.coerce.number().min(0).max(100).default(0.5),
    liquidated_damages_max_cap_percent: z.coerce.number().min(0).max(100).default(10),
    ld_provisions_notes: z.string().optional().nullable(),

    eot_clause: z.string().default('Clause 5 CPWD / PWD GCC'),
    eot_notice_days: z.coerce.number().int().min(1).default(14),
    eot_provisions_notes: z.string().optional().nullable(),

    escalation_applicable: z.boolean().default(false),
    escalation_clause: z.string().optional().nullable(),
    escalation_notes: z.string().optional().nullable(),

    variation_limit_percent: z.coerce.number().min(0).max(100).default(25),
    variation_clause: z.string().default('Clause 12 CPWD / PWD GCC'),
    variation_notes: z.string().optional().nullable(),

    payment_terms_frequency: z.string().default('monthly'),
    payment_terms_notes: z.string().optional().nullable(),

    gcc_type: z.string().default('CPWD GCC 2020 / 2024'),
    gcc_edition: z.string().optional().nullable(),
    scc_notes: z.string().optional().nullable(),

    status: z.enum(['active', 'completed', 'terminated', 'suspended', 'foreclosed', 'in_arbitration']).default('active'),
    notes: z.string().optional().nullable(),
  })
  .refine(
    data => {
      if (data.work_commencement_date && data.original_completion_date) {
        return new Date(data.original_completion_date) >= new Date(data.work_commencement_date)
      }
      return true
    },
    {
      message: 'Original Completion Date must be on or after Work Commencement Date',
      path: ['original_completion_date'],
    }
  )
  .refine(
    data => {
      if (data.dlp_start_date && data.dlp_end_date) {
        return new Date(data.dlp_end_date) >= new Date(data.dlp_start_date)
      }
      return true
    },
    {
      message: 'DLP End Date must be on or after DLP Start Date',
      path: ['dlp_end_date'],
    }
  )

export type ContractFormData = z.infer<typeof contractSchema>

export const contractDocumentSchema = z.object({
  document_type: z.enum([
    'Agreement',
    'Work Order',
    'NIT',
    'BOQ',
    'GCC',
    'SCC',
    'Corrigendum',
    'Drawings',
    'Specifications',
    'Addendum',
    'Department Letter',
    'Contractor Letter',
    'Other',
  ]),
  title: z.string().min(1, 'Document title is required'),
  document_number: z.string().optional().nullable(),
  issue_date: z.string().optional().nullable(),
  file_url: z.string().min(1, 'File URL is required'),
  file_name: z.string().optional().nullable(),
  file_size_bytes: z.number().optional().nullable(),
  file_type: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export type ContractDocumentFormData = z.infer<typeof contractDocumentSchema>
