import { z } from 'zod'

export const inventoryUnitEnum = z.enum([
  'bags',
  'mt',
  'cft',
  'sqft',
  'liters',
  'kg',
  'nos',
  'trips',
])

export const inventoryTrxTypeEnum = z.enum([
  'receipt_in',
  'issue_out',
  'return_in',
  'wastage_adjustment',
])

/**
 * Validation schema for registering a new inventory item
 */
export const createInventoryItemSchema = z.object({
  item_name: z.string().trim().min(2, 'Item name must be at least 2 characters.').max(150),
  item_code: z.string().trim().max(50).optional().or(z.literal('')),
  category: z.string().trim().max(50).default('material'),
  unit: inventoryUnitEnum.default('bags'),
  current_stock: z.coerce.number().min(0, 'Starting stock cannot be negative.').default(0),
  minimum_stock_alert: z.coerce.number().min(0, 'Minimum buffer cannot be negative.').default(0),
  wastage_threshold_pct: z.coerce.number().min(0, 'Wastage threshold cannot be negative.').max(100, 'Threshold cannot exceed 100%.').default(3.00),
  project_id: z.string().uuid().optional().or(z.literal('')),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
})

export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>

/**
 * Validation schema for logging goods receipt (GRN) or site issue out
 */
export const createInventoryTrxSchema = z.object({
  item_id: z.string().uuid('Please select a valid inventory material.'),
  project_id: z.string().uuid().optional().or(z.literal('')),
  supplier_id: z.string().uuid().optional().or(z.literal('')),
  transaction_type: inventoryTrxTypeEnum.default('receipt_in'),
  quantity: z.coerce.number().positive('Quantity must be greater than 0.'),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid transaction date (YYYY-MM-DD) is required.'),
  destination_location: z.string().trim().max(150).optional().or(z.literal('')),
  issued_to_person: z.string().trim().max(100).optional().or(z.literal('')),
  challan_number: z.string().trim().max(80).optional().or(z.literal('')),
  vehicle_number: z.string().trim().max(50).optional().or(z.literal('')),
  remarks: z.string().trim().max(500).optional().or(z.literal('')),
})

export type CreateInventoryTrxInput = z.infer<typeof createInventoryTrxSchema>

