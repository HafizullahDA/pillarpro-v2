-- ============================================================
-- PillarPro v2 — Migration 042: Manual Overtime (OT) in Attendance
-- Safe to re-run (idempotent).
-- ============================================================

-- 1. Add overtime_hours column to attendance table if not present
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC(5,2) NOT NULL DEFAULT 0;

-- 2. Update status check constraint to permit 'overtime' status
ALTER TABLE public.attendance
  DROP CONSTRAINT IF EXISTS attendance_status_check;

ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_status_check
  CHECK (status IN ('present', 'absent', 'half_day', 'overtime'));

-- 3. Comment explaining calculation convention
COMMENT ON COLUMN public.attendance.overtime_hours IS 'Overtime logged in hours. 7 net working hours = 1.0 day shift equivalent (1 hour break). Hourly rate = daily_wage_rate / 7.';

