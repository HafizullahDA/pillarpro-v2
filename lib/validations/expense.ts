import { z } from 'zod'

/**
 * Validation schema for creating a project or site expense
 */
export const createExpenseSchema = z.object({
  project_id: z.string().uuid('Please select a valid civil project.'),
  category: z.enum([
    'labor',
    'material',
    'equipment',
    'transport',
    'fuel',
    'admin',
    'tendering',
    'other',
  ]),
  amount: z.coerce
    .number()
    .positive('Expense amount must be greater than ₹0.'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid expense date (YYYY-MM-DD) is required.'),
  description: z.string().trim().min(1, 'Description of expense is required.').max(500),
  payment_mode: z.enum(['Cash', 'NEFT/RTGS', 'Cheque', 'UPI', 'Other']).default('Cash'),
  reference: z.string().trim().max(100).optional().or(z.literal('')),
  paid_by_partner_id: z.string().uuid().optional().or(z.literal('')),
})

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>

