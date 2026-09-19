import { z } from 'zod'

export const weatherConditionEnum = z.enum([
  'sunny_clear',
  'overcast_cloudy',
  'rain_drizzle',
  'heavy_rain_halt',
  'extreme_heat',
  'fog_cold',
])

export const dprStatusEnum = z.enum(['draft', 'submitted', 'verified'])

export const dprPhotoSchema = z.object({
  url: z.string().url('Photo URL must be a valid link.'),
  caption: z.string().trim().max(200).optional().or(z.literal('')),
  taken_at: z.string().optional(),
})

/**
 * Validation schema for submitting or updating a Daily Progress Report (DPR)
 */
export const createDPRSchema = z.object({
  project_id: z.string().uuid('Please select a valid civil project.'),
  report_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid report date (YYYY-MM-DD) is required.'),
  weather: weatherConditionEnum.default('sunny_clear'),
  work_completed_notes: z
    .string()
    .trim()
    .min(5, 'Please provide details of work completed today (at least 5 characters).')
    .max(3000, 'Work notes cannot exceed 3000 characters.'),
  impediments_delays: z.string().trim().max(1000).optional().or(z.literal('')),
  total_manpower_count: z.coerce.number().min(0).default(0),
  masons_count: z.coerce.number().min(0).default(0),
  labourers_count: z.coerce.number().min(0).default(0),
  machinery_active_count: z.coerce.number().min(0).default(0),
  photos: z.array(dprPhotoSchema).max(12, 'You can attach up to 12 site photos per daily report.').default([]),
  status: dprStatusEnum.default('submitted'),
})

export type CreateDPRInput = z.infer<typeof createDPRSchema>
export type DPRPhoto = z.infer<typeof dprPhotoSchema>

