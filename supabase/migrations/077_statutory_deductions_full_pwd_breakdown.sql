-- ==============================================================================
-- PillarPro v2 — Migration 077: Full Indian Government PWD/CPWD Statutory Deductions
--
-- 1. Adds statutory deduction columns to public.ra_bills:
--    - Income Tax TDS u/s 194C (rate & amount)
--    - GST-TDS under Section 51 (rate & amount)
--    - BOCW Labour Welfare Cess (rate & amount)
--    - Royalty / Minor Mineral Recovery
--    - Mobilization / Secured Advance Recovery
--    - Temporary Withheld Amount (EOT / QC hold)
--    - deductions_breakdown JSONB
-- 2. Ensures ra_bill_id alias column on public.bill_deductions for full resilience
-- 3. 100% backward compatible with all existing RA bills
-- ==============================================================================

-- 1. Add statutory deduction columns to public.ra_bills
ALTER TABLE public.ra_bills
  ADD COLUMN IF NOT EXISTS it_tds_percentage NUMERIC(5,2) DEFAULT 2.00,
  ADD COLUMN IF NOT EXISTS it_tds_amount NUMERIC(15,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS gst_tds_percentage NUMERIC(5,2) DEFAULT 2.00,
  ADD COLUMN IF NOT EXISTS gst_tds_amount NUMERIC(15,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS labour_cess_percentage NUMERIC(5,2) DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS labour_cess_amount NUMERIC(15,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS royalty_recovery NUMERIC(15,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS mobilization_advance_recovery NUMERIC(15,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS withheld_amount NUMERIC(15,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS deductions_breakdown JSONB DEFAULT '{}'::jsonb;

-- Ensure migration 010 roll-up columns are present
ALTER TABLE public.ra_bills
  ADD COLUMN IF NOT EXISTS tds_deducted NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS gst_tds_deducted NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS labour_cess_deducted NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS other_deductions NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS total_deductions NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS net_bank_received NUMERIC(15,2) NOT NULL DEFAULT 0.00;

-- 2. Ensure bill_deductions has ra_bill_id column in addition to bill_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bill_deductions') THEN
    ALTER TABLE public.bill_deductions
      ADD COLUMN IF NOT EXISTS ra_bill_id UUID REFERENCES public.ra_bills(id) ON DELETE CASCADE;

    UPDATE public.bill_deductions
    SET ra_bill_id = bill_id
    WHERE ra_bill_id IS NULL AND bill_id IS NOT NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.ra_bills.it_tds_amount IS 'Income Tax TDS u/s 194C deducted at source';
COMMENT ON COLUMN public.ra_bills.gst_tds_amount IS 'GST TDS under Section 51 (1% CGST + 1% SGST)';
COMMENT ON COLUMN public.ra_bills.labour_cess_amount IS '1% BOCW Labour Welfare Cess Act 1996';
COMMENT ON COLUMN public.ra_bills.royalty_recovery IS 'Mining/Geology Dept royalty on minor minerals (sand, gravel, bajri, stone)';
COMMENT ON COLUMN public.ra_bills.mobilization_advance_recovery IS 'CPWD GCC Clause 10B / Form 26 Item 8(a) Mobilization Advance recovery';
COMMENT ON COLUMN public.ra_bills.withheld_amount IS 'Temporary departmental withholding for EOT sanction or QC punch list milestones';
COMMENT ON COLUMN public.ra_bills.deductions_breakdown IS 'Comprehensive JSON snapshot of all statutory, departmental, and contractual deductions';
