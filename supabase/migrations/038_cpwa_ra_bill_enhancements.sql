-- ============================================================
-- PillarPro v2 — Migration 038: CPWA Code Book of Forms Enhancements
-- Aligns Running Account (RA) Billing with the official Central Public Works
-- Account Code (CPWA Code) Form 24, Form 26, Form 27-B, and Form 35-A.
-- Safe to run in Supabase SQL Editor (idempotent).
-- ============================================================

-- 1. Add CPWA statutory classification & citation columns to ra_bills
ALTER TABLE public.ra_bills
  ADD COLUMN IF NOT EXISTS bill_type TEXT DEFAULT 'running' CHECK (bill_type IN ('running', 'first_and_final', 'final')),
  ADD COLUMN IF NOT EXISTS mb_number TEXT,
  ADD COLUMN IF NOT EXISTS mb_page_start INTEGER,
  ADD COLUMN IF NOT EXISTS mb_page_end INTEGER,
  ADD COLUMN IF NOT EXISTS measurement_date DATE,
  ADD COLUMN IF NOT EXISTS measuring_officer_name TEXT,
  ADD COLUMN IF NOT EXISTS measuring_officer_designation TEXT DEFAULT 'Junior Engineer',
  ADD COLUMN IF NOT EXISTS advance_payments_unmeasured NUMERIC(15,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS cement_recovery NUMERIC(15,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS steel_recovery NUMERIC(15,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS other_material_recovery NUMERIC(15,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS actual_completion_date DATE,
  ADD COLUMN IF NOT EXISTS dlp_months INTEGER DEFAULT 12;

COMMENT ON COLUMN public.ra_bills.bill_type IS 'CPWA Form 26 (running), Form 24 (first_and_final), or Form 27-B / Form 26 Final (final)';
COMMENT ON COLUMN public.ra_bills.mb_number IS 'Official Measurement Book (MB) number as per Form 23';
COMMENT ON COLUMN public.ra_bills.mb_page_start IS 'Starting page in the Measurement Book';
COMMENT ON COLUMN public.ra_bills.mb_page_end IS 'Ending page in the Measurement Book';
COMMENT ON COLUMN public.ra_bills.advance_payments_unmeasured IS 'Item 2 of Form 26: Advance payment for work not yet measured';
COMMENT ON COLUMN public.ra_bills.cement_recovery IS 'Form 35-A: Departmental cement issue recovery creditable to work under Item 8(a)';
COMMENT ON COLUMN public.ra_bills.steel_recovery IS 'Form 35-A: Departmental steel issue recovery creditable to work under Item 8(a)';
COMMENT ON COLUMN public.ra_bills.actual_completion_date IS 'Actual physical completion date required for Final Bill closure';
COMMENT ON COLUMN public.ra_bills.dlp_months IS 'Defect Liability Period in months for retention release countdown';

