-- ==============================================================================
-- PillarPro v2 — Migration 076: e-MB Multi-Row Measurements, Deductions & Steel BBS
-- 
-- 1. Adds measurement_rows JSONB to public.measurement_entries for sub-row breakdowns
-- 2. Updates calculation_mode check constraint to include 'steel_bbs'
-- 3. Fully backward compatible with all existing single-row measurement entries
-- ==============================================================================

-- 1. Add measurement_rows JSONB column
ALTER TABLE public.measurement_entries
  ADD COLUMN IF NOT EXISTS measurement_rows JSONB DEFAULT NULL;

COMMENT ON COLUMN public.measurement_entries.measurement_rows IS
  'Array of itemized dimension sub-rows (particulars, add/deduct mode, Nos, L, B, D/H, rebar dia, unit wt, row qty).';

-- 2. Update calculation_mode check constraint to include 'steel_bbs'
ALTER TABLE public.measurement_entries
  DROP CONSTRAINT IF EXISTS measurement_entries_calculation_mode_check;

ALTER TABLE public.measurement_entries
  ADD CONSTRAINT measurement_entries_calculation_mode_check
  CHECK (calculation_mode IN ('l_b_d', 'l_b', 'l_h', 'num_l_b_h', 'running_length', 'weight', 'steel_bbs', 'count', 'manual'));

