import { z } from 'zod'

export const machineryTypeEnum = z.enum([
  'excavator',
  'dumper',
  'roller',
  'transit_mixer',
  'generator',
  'loader',
  'crane',
  'tractor',
  'other',
])

export const assetOwnershipEnum = z.enum(['owned', 'hired'])
export const meterTrackingEnum = z.enum(['hours', 'km'])
export const machineryStatusEnum = z.enum(['active', 'breakdown', 'idle', 'demobilized'])

/**
 * Validation schema for adding a machine/vehicle asset
 */
export const createMachineryAssetSchema = z.object({
  asset_name: z.string().trim().min(2, 'Machine/vehicle name is required.').max(100),
  asset_type: machineryTypeEnum.default('excavator'),
  registration_number: z.string().trim().max(50).optional().or(z.literal('')),
  model_year: z.string().trim().max(20).optional().or(z.literal('')),
  ownership: assetOwnershipEnum.default('owned'),
  meter_tracking: meterTrackingEnum.default('hours'),
  hourly_rate: z.coerce.number().min(0).default(0),
  current_meter: z.coerce.number().min(0).default(0),
  status: machineryStatusEnum.default('active'),
  project_id: z.string().uuid().optional().or(z.literal('')),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
})

export type CreateMachineryAssetInput = z.infer<typeof createMachineryAssetSchema>

/**
 * Validation schema for logging daily machine operation & diesel fuel
 */
export const createMachineryLogSchema = z.object({
  asset_id: z.string().uuid('Please select a valid machine/vehicle.'),
  project_id: z.string().uuid().optional().or(z.literal('')),
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date (YYYY-MM-DD) is required.'),
  operator_name: z.string().trim().max(100).optional().or(z.literal('')),
  start_meter: z.coerce.number().min(0, 'Start meter cannot be negative.'),
  end_meter: z.coerce.number().min(0, 'End meter cannot be negative.'),
  work_description: z.string().trim().max(500).optional().or(z.literal('')),
  diesel_liters: z.coerce.number().min(0, 'Diesel quantity cannot be negative.').default(0),
  diesel_rate_per_liter: z.coerce.number().min(0, 'Diesel rate cannot be negative.').default(0),
  fuel_vendor: z.string().trim().max(150).optional().or(z.literal('')),
  fuel_slip_url: z.string().url().optional().or(z.literal('')),
}).refine(data => data.end_meter >= data.start_meter, {
  message: 'End meter reading must be greater than or equal to start meter reading.',
  path: ['end_meter'],
})

export type CreateMachineryLogInput = z.infer<typeof createMachineryLogSchema>

