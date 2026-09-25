-- ============================================================
-- PillarPro v2 — Migration 050: Support Additional Security Deposit / CDR
--
-- Ensures enum values exist in public.security_deposit_type:
-- - 'additional_performance_security' (Unbalanced bid ASD / CDR)
-- - 'additional_security_deposit'
-- - 'fixed_deposit_receipt'
-- - 'other'
-- ============================================================

DO $$
BEGIN
  ALTER TYPE public.security_deposit_type ADD VALUE IF NOT EXISTS 'additional_performance_security';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE public.security_deposit_type ADD VALUE IF NOT EXISTS 'additional_security_deposit';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE public.security_deposit_type ADD VALUE IF NOT EXISTS 'fixed_deposit_receipt';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE public.security_deposit_type ADD VALUE IF NOT EXISTS 'other';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
