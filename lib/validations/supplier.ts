import { z } from 'zod'

/**
 * Validation schema for recording a material procurement from a supplier
 */
export const createProcurementSchema = z.object({
  supplier_id: z.string().uuid('Please select a valid supplier.'),
  project_id: z.string().uuid().optional().or(z.literal('')),
  description: z.string().trim().min(1, 'Material or invoice description is required.').max(500),
  quantity: z.coerce.number().min(0, 'Quantity cannot be negative.').optional().or(z.literal('')),
  rate: z.coerce.number().min(0, 'Rate cannot be negative.').optional().or(z.literal('')),
  unit: z.string().trim().max(30).default('nos'),
  amount: z.coerce
    .number()
    .positive('Procurement amount must be greater than ₹0.'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid procurement date (YYYY-MM-DD) is required.'),
  reference: z.string().trim().max(100).optional().or(z.literal('')),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
})

export type CreateProcurementInput = z.infer<typeof createProcurementSchema>

/**
 * Validation schema for recording a payment disbursement to a supplier
 */
export const createSupplierPaymentSchema = z.object({
  supplier_id: z.string().uuid('Please select a valid supplier.'),
  project_id: z.string().uuid().optional().or(z.literal('')),
  amount: z.coerce
    .number()
    .positive('Payment amount must be greater than ₹0.'),
  mode: z.enum(['cash', 'bank_transfer', 'cheque', 'upi', 'other']).default('bank_transfer'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid payment date (YYYY-MM-DD) is required.'),
  reference: z.string().trim().max(100).optional().or(z.literal('')),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
})

export type CreateSupplierPaymentInput = z.infer<typeof createSupplierPaymentSchema>

