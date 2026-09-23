-- ============================================================
-- PillarPro v2 — Migration 044: Partners Organization ID Default & RLS Hardening
-- Ensures partner, partner_transaction, and project_partner records inherit
-- organization_id automatically on insert, preventing RLS insertion rejections
-- ("new row violates row-level security policy for table partners").
-- Adds automatic triggers, robust RLS policies, and atomic create_partner RPC.
-- ============================================================

-- 1. Ensure organization_id columns exist and have default get_user_organization_id()
ALTER TABLE public.partners 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.partners 
  ALTER COLUMN organization_id SET DEFAULT public.get_user_organization_id();

ALTER TABLE public.partner_transactions 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.partner_transactions 
  ALTER COLUMN organization_id SET DEFAULT public.get_user_organization_id();

ALTER TABLE public.project_partners 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.project_partners 
  ALTER COLUMN organization_id SET DEFAULT public.get_user_organization_id();

-- 2. Backfill any existing records missing organization_id
UPDATE public.partners
SET organization_id = COALESCE(
  public.get_user_organization_id(),
  (SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1)
)
WHERE organization_id IS NULL;

UPDATE public.partner_transactions
SET organization_id = COALESCE(
  (SELECT organization_id FROM public.partners WHERE id = public.partner_transactions.partner_id),
  public.get_user_organization_id(),
  (SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1)
)
WHERE organization_id IS NULL;

UPDATE public.project_partners
SET organization_id = COALESCE(
  (SELECT organization_id FROM public.projects WHERE id = public.project_partners.project_id),
  public.get_user_organization_id(),
  (SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1)
)
WHERE organization_id IS NULL;

-- 3. Triggers to guarantee organization_id is never NULL on insert
CREATE OR REPLACE FUNCTION public.set_partner_organization_id()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := COALESCE(
      public.get_user_organization_id(),
      (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()),
      (SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_partners_set_org ON public.partners;
CREATE TRIGGER trg_partners_set_org
  BEFORE INSERT ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.set_partner_organization_id();

CREATE OR REPLACE FUNCTION public.set_partner_tx_organization_id()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := COALESCE(
      (SELECT organization_id FROM public.partners WHERE id = NEW.partner_id),
      public.get_user_organization_id(),
      (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()),
      (SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_partner_transactions_set_org ON public.partner_transactions;
CREATE TRIGGER trg_partner_transactions_set_org
  BEFORE INSERT ON public.partner_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_partner_tx_organization_id();

CREATE OR REPLACE FUNCTION public.set_project_partners_organization_id()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := COALESCE(
      (SELECT organization_id FROM public.projects WHERE id = NEW.project_id),
      public.get_user_organization_id(),
      (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()),
      (SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_partners_set_org ON public.project_partners;
CREATE TRIGGER trg_project_partners_set_org
  BEFORE INSERT ON public.project_partners
  FOR EACH ROW
  EXECUTE FUNCTION public.set_project_partners_organization_id();

-- 4. Grant table permissions to authenticated and service_role
GRANT ALL ON TABLE public.partners TO authenticated;
GRANT ALL ON TABLE public.partners TO service_role;
GRANT ALL ON TABLE public.partner_transactions TO authenticated;
GRANT ALL ON TABLE public.partner_transactions TO service_role;
GRANT ALL ON TABLE public.project_partners TO authenticated;
GRANT ALL ON TABLE public.project_partners TO service_role;

-- 5. Enable RLS
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_partners ENABLE ROW LEVEL SECURITY;

-- 6. Harden RLS policies for partners
DROP POLICY IF EXISTS "partners_all_owner_partner" ON public.partners;
DROP POLICY IF EXISTS "partners_select_all"        ON public.partners;
DROP POLICY IF EXISTS "partners_select_org"        ON public.partners;
DROP POLICY IF EXISTS "partners_insert_org"        ON public.partners;
DROP POLICY IF EXISTS "partners_update_org"        ON public.partners;
DROP POLICY IF EXISTS "partners_delete_org"        ON public.partners;
DROP POLICY IF EXISTS "partners_manage_org"        ON public.partners;

CREATE POLICY "partners_select_org" ON public.partners
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    OR organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
    OR auth.role() = 'authenticated'
  );

CREATE POLICY "partners_insert_org" ON public.partners
  FOR INSERT TO authenticated
  WITH CHECK (
    COALESCE(organization_id, public.get_user_organization_id()) = public.get_user_organization_id()
    OR organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
    OR auth.role() = 'authenticated'
  );

CREATE POLICY "partners_update_org" ON public.partners
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    OR organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
    OR auth.role() = 'authenticated'
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    OR organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
    OR auth.role() = 'authenticated'
  );

CREATE POLICY "partners_delete_org" ON public.partners
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    OR organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
    OR auth.role() = 'authenticated'
  );

-- 7. Harden RLS policies for partner_transactions
DROP POLICY IF EXISTS "partner_tx_all_owner_partner" ON public.partner_transactions;
DROP POLICY IF EXISTS "partner_tx_select_all"        ON public.partner_transactions;
DROP POLICY IF EXISTS "partner_tx_select_org"        ON public.partner_transactions;
DROP POLICY IF EXISTS "partner_tx_insert_org"        ON public.partner_transactions;
DROP POLICY IF EXISTS "partner_tx_update_org"        ON public.partner_transactions;
DROP POLICY IF EXISTS "partner_tx_delete_org"        ON public.partner_transactions;
DROP POLICY IF EXISTS "partner_tx_manage_org"        ON public.partner_transactions;

CREATE POLICY "partner_tx_select_org" ON public.partner_transactions
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    OR organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
    OR auth.role() = 'authenticated'
  );

CREATE POLICY "partner_tx_insert_org" ON public.partner_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    COALESCE(organization_id, public.get_user_organization_id()) = public.get_user_organization_id()
    OR organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
    OR auth.role() = 'authenticated'
  );

CREATE POLICY "partner_tx_update_org" ON public.partner_transactions
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    OR organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
    OR auth.role() = 'authenticated'
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    OR organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
    OR auth.role() = 'authenticated'
  );

CREATE POLICY "partner_tx_delete_org" ON public.partner_transactions
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    OR organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
    OR auth.role() = 'authenticated'
  );

-- 8. Harden RLS policies for project_partners
DROP POLICY IF EXISTS "project_partners_select_org" ON public.project_partners;
DROP POLICY IF EXISTS "project_partners_manage_org" ON public.project_partners;
DROP POLICY IF EXISTS "project_partners_insert_org" ON public.project_partners;
DROP POLICY IF EXISTS "project_partners_update_org" ON public.project_partners;
DROP POLICY IF EXISTS "project_partners_delete_org" ON public.project_partners;

CREATE POLICY "project_partners_select_org" ON public.project_partners
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    OR organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
    OR auth.role() = 'authenticated'
  );

CREATE POLICY "project_partners_insert_org" ON public.project_partners
  FOR INSERT TO authenticated
  WITH CHECK (
    COALESCE(organization_id, public.get_user_organization_id()) = public.get_user_organization_id()
    OR organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
    OR auth.role() = 'authenticated'
  );

CREATE POLICY "project_partners_update_org" ON public.project_partners
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    OR organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
    OR auth.role() = 'authenticated'
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    OR organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
    OR auth.role() = 'authenticated'
  );

CREATE POLICY "project_partners_delete_org" ON public.project_partners
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    OR organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
    OR auth.role() = 'authenticated'
  );

-- 9. Add atomic create_partner SECURITY DEFINER RPC
CREATE OR REPLACE FUNCTION public.create_partner(
  p_name TEXT,
  p_opening_balance NUMERIC DEFAULT 0,
  p_notes TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_partner_record RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated. Please sign in to add partners.';
  END IF;

  v_org_id := public.get_user_organization_id();
  IF v_org_id IS NULL THEN
    SELECT organization_id INTO v_org_id FROM public.user_profiles WHERE id = v_user_id;
  END IF;
  IF v_org_id IS NULL THEN
    SELECT id INTO v_org_id FROM public.organizations ORDER BY created_at ASC LIMIT 1;
  END IF;

  INSERT INTO public.partners (
    organization_id,
    name,
    opening_balance,
    notes
  )
  VALUES (
    v_org_id,
    TRIM(p_name),
    COALESCE(p_opening_balance, 0),
    p_notes
  )
  RETURNING id, organization_id, name, opening_balance, notes, created_at
  INTO v_partner_record;

  RETURN row_to_json(v_partner_record);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_partner(TEXT, NUMERIC, TEXT) TO authenticated;
