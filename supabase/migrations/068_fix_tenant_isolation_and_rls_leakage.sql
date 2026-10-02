-- ============================================================
-- PillarPro v2 — Migration 068: Eliminate Tenant Leakage & Harden Multi-Tenant Isolation
-- 
-- 1. ENSURE organization_id COLUMN EXISTS on all relevant tables
--    Guarantees policies will never fail with 42703 (column does not exist).
--
-- 2. FIX get_user_organization_id() & get_organization_profile():
--    Removes dangerous fallback to oldest organization from Migration 035 and 045.
--    If user has no organization_id, returns NULL instead of leaking another tenant's org.
--
-- 3. PURGE 'OR auth.role() = ''authenticated''' LEAKAGE:
--    Migration 043, 044, 048, 056, 057 added 'OR auth.role() = ''authenticated'''
--    which completely bypassed tenant isolation and allowed any logged-in user
--    to see other contractors' hindrances, EOT cases, bills, evidence, and partners.
--
-- 4. RE-ESTABLISH AIRTIGHT ORGANIZATION-SCOPED RLS POLICIES across:
--    - public.hindrances
--    - public.eot_applications
--    - public.evidence_vault & public.evidence_versions
--    - public.contract_correspondence & public.contract_notice_rules
--    - public.bills & public.receivable_payments
--    - public.partners, public.project_partners, public.partner_transactions
-- ============================================================

-- 0. Ensure organization_id column exists on all tables before creating RLS policies
ALTER TABLE public.hindrances ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.eot_applications ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.evidence_vault ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.contract_correspondence ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.contract_notice_rules ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.receivable_payments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.project_partners ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.partner_transactions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);


-- 1. FIX get_user_organization_id() & get_organization_profile() (NO CROSS-TENANT FALLBACK)
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.user_profiles WHERE id = auth.uid() AND organization_id IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_organization_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_organization_profile()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org json;
BEGIN
  -- Look up org for current authenticated user ONLY
  SELECT json_build_object(
    'id', o.id,
    'name', o.name,
    'legal_name', o.legal_name,
    'registration_no', o.registration_no,
    'gstin', o.gstin,
    'pan', o.pan,
    'address', o.address,
    'phone', o.phone,
    'email', o.email,
    'logo_url', o.logo_url,
    'signature_url', o.signature_url,
    'plan_tier', COALESCE(o.plan_tier, 'growth'),
    'subscription_status', COALESCE(o.subscription_status, 'trialing'),
    'trial_ends_at', o.trial_ends_at,
    'current_period_end', o.current_period_end,
    'max_active_sites', COALESCE(o.max_active_sites, 6),
    'billing_cycle', COALESCE(o.billing_cycle, 'monthly'),
    'created_at', o.created_at,
    'user_created_at', up.created_at
  ) INTO v_org
  FROM public.organizations o
  JOIN public.user_profiles up ON up.organization_id = o.id
  WHERE up.id = auth.uid()
  LIMIT 1;

  -- NEVER fallback to other organizations in the database!
  RETURN v_org;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_organization_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organization_profile() TO service_role;


-- 2. AIRTIGHT RLS FOR public.hindrances
ALTER TABLE public.hindrances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hindrances_select_org" ON public.hindrances;
DROP POLICY IF EXISTS "hindrances_insert_org" ON public.hindrances;
DROP POLICY IF EXISTS "hindrances_update_org" ON public.hindrances;
DROP POLICY IF EXISTS "hindrances_delete_org" ON public.hindrances;

CREATE POLICY "hindrances_select_org" ON public.hindrances
  FOR SELECT TO authenticated
  USING (
    (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id())
    OR (project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id()))
  );

CREATE POLICY "hindrances_insert_org" ON public.hindrances
  FOR INSERT TO authenticated
  WITH CHECK (
    (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id())
    OR (project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id()))
  );

CREATE POLICY "hindrances_update_org" ON public.hindrances
  FOR UPDATE TO authenticated
  USING (
    (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id())
    OR (project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id()))
  );

CREATE POLICY "hindrances_delete_org" ON public.hindrances
  FOR DELETE TO authenticated
  USING (
    (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id())
    OR (project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id()))
  );


-- 3. AIRTIGHT RLS FOR public.eot_applications
ALTER TABLE public.eot_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eot_select_org" ON public.eot_applications;
DROP POLICY IF EXISTS "eot_insert_org" ON public.eot_applications;
DROP POLICY IF EXISTS "eot_update_org" ON public.eot_applications;
DROP POLICY IF EXISTS "eot_delete_org" ON public.eot_applications;

CREATE POLICY "eot_select_org" ON public.eot_applications
  FOR SELECT TO authenticated
  USING (
    (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id())
    OR (project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id()))
  );

CREATE POLICY "eot_insert_org" ON public.eot_applications
  FOR INSERT TO authenticated
  WITH CHECK (
    (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id())
    OR (project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id()))
  );

CREATE POLICY "eot_update_org" ON public.eot_applications
  FOR UPDATE TO authenticated
  USING (
    (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id())
    OR (project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id()))
  );

CREATE POLICY "eot_delete_org" ON public.eot_applications
  FOR DELETE TO authenticated
  USING (
    (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id())
    OR (project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id()))
  );


-- 4. AIRTIGHT RLS FOR public.evidence_vault & evidence_versions
ALTER TABLE public.evidence_vault ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "evidence_vault_select_org" ON public.evidence_vault;
DROP POLICY IF EXISTS "evidence_vault_insert_org" ON public.evidence_vault;
DROP POLICY IF EXISTS "evidence_vault_update_org" ON public.evidence_vault;
DROP POLICY IF EXISTS "evidence_vault_delete_org" ON public.evidence_vault;

CREATE POLICY "evidence_vault_select_org" ON public.evidence_vault
  FOR SELECT TO authenticated
  USING (
    (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id())
    OR (project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id()))
  );

CREATE POLICY "evidence_vault_insert_org" ON public.evidence_vault
  FOR INSERT TO authenticated
  WITH CHECK (
    (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id())
    OR (project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id()))
  );

CREATE POLICY "evidence_vault_update_org" ON public.evidence_vault
  FOR UPDATE TO authenticated
  USING (
    (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id())
    OR (project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id()))
  );

CREATE POLICY "evidence_vault_delete_org" ON public.evidence_vault
  FOR DELETE TO authenticated
  USING (
    (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id())
    OR (project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id()))
  );

ALTER TABLE public.evidence_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "evidence_versions_select_org" ON public.evidence_versions;
DROP POLICY IF EXISTS "evidence_versions_insert_org" ON public.evidence_versions;

CREATE POLICY "evidence_versions_select_org" ON public.evidence_versions
  FOR SELECT TO authenticated
  USING (
    evidence_id IN (
      SELECT ev.id FROM public.evidence_vault ev
      WHERE ev.organization_id = public.get_user_organization_id()
         OR ev.project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id())
    )
  );

CREATE POLICY "evidence_versions_insert_org" ON public.evidence_versions
  FOR INSERT TO authenticated
  WITH CHECK (
    evidence_id IN (
      SELECT ev.id FROM public.evidence_vault ev
      WHERE ev.organization_id = public.get_user_organization_id()
         OR ev.project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id())
    )
  );


-- 5. AIRTIGHT RLS FOR public.contract_correspondence & contract_notice_rules
ALTER TABLE public.contract_correspondence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contract_correspondence_select_org" ON public.contract_correspondence;
DROP POLICY IF EXISTS "contract_correspondence_insert_org" ON public.contract_correspondence;
DROP POLICY IF EXISTS "contract_correspondence_update_org" ON public.contract_correspondence;
DROP POLICY IF EXISTS "contract_correspondence_delete_org" ON public.contract_correspondence;

CREATE POLICY "contract_correspondence_select_org" ON public.contract_correspondence
  FOR SELECT TO authenticated
  USING (
    (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id())
    OR (project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id()))
  );

CREATE POLICY "contract_correspondence_insert_org" ON public.contract_correspondence
  FOR INSERT TO authenticated
  WITH CHECK (
    (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id())
    OR (project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id()))
  );

CREATE POLICY "contract_correspondence_update_org" ON public.contract_correspondence
  FOR UPDATE TO authenticated
  USING (
    (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id())
    OR (project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id()))
  );

CREATE POLICY "contract_correspondence_delete_org" ON public.contract_correspondence
  FOR DELETE TO authenticated
  USING (
    (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id())
    OR (project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id()))
  );

ALTER TABLE public.contract_notice_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notice_rules_select" ON public.contract_notice_rules;
DROP POLICY IF EXISTS "notice_rules_insert" ON public.contract_notice_rules;
DROP POLICY IF EXISTS "notice_rules_update" ON public.contract_notice_rules;
DROP POLICY IF EXISTS "notice_rules_delete" ON public.contract_notice_rules;

CREATE POLICY "notice_rules_select" ON public.contract_notice_rules
  FOR SELECT TO authenticated
  USING (
    organization_id IS NULL
    OR organization_id = public.get_user_organization_id()
  );

CREATE POLICY "notice_rules_insert" ON public.contract_notice_rules
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
  );

CREATE POLICY "notice_rules_update" ON public.contract_notice_rules
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
  );

CREATE POLICY "notice_rules_delete" ON public.contract_notice_rules
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
  );


-- 6. AIRTIGHT RLS FOR public.bills & receivable_payments
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bills_select_org" ON public.bills;
DROP POLICY IF EXISTS "bills_insert_org" ON public.bills;
DROP POLICY IF EXISTS "bills_update_org" ON public.bills;
DROP POLICY IF EXISTS "bills_delete_org" ON public.bills;

CREATE POLICY "bills_select_org" ON public.bills
  FOR SELECT TO authenticated
  USING (
    project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id())
    OR (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id())
  );

CREATE POLICY "bills_insert_org" ON public.bills
  FOR INSERT TO authenticated
  WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id())
    OR (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id())
  );

CREATE POLICY "bills_update_org" ON public.bills
  FOR UPDATE TO authenticated
  USING (
    project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id())
    OR (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id())
  );

CREATE POLICY "bills_delete_org" ON public.bills
  FOR DELETE TO authenticated
  USING (
    project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id())
    OR (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id())
  );

ALTER TABLE public.receivable_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "receivable_payments_select_org" ON public.receivable_payments;
DROP POLICY IF EXISTS "receivable_payments_insert_org" ON public.receivable_payments;
DROP POLICY IF EXISTS "receivable_payments_update_org" ON public.receivable_payments;
DROP POLICY IF EXISTS "receivable_payments_delete_org" ON public.receivable_payments;

CREATE POLICY "receivable_payments_select_org" ON public.receivable_payments
  FOR SELECT TO authenticated
  USING (
    project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id())
    OR (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id())
  );

CREATE POLICY "receivable_payments_insert_org" ON public.receivable_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id())
    OR (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id())
  );

CREATE POLICY "receivable_payments_update_org" ON public.receivable_payments
  FOR UPDATE TO authenticated
  USING (
    project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id())
    OR (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id())
  );

CREATE POLICY "receivable_payments_delete_org" ON public.receivable_payments
  FOR DELETE TO authenticated
  USING (
    project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id())
    OR (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id())
  );


-- 7. AIRTIGHT RLS FOR public.partners, project_partners & partner_transactions
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partners_select_org" ON public.partners;
DROP POLICY IF EXISTS "partners_insert_org" ON public.partners;
DROP POLICY IF EXISTS "partners_update_org" ON public.partners;
DROP POLICY IF EXISTS "partners_delete_org" ON public.partners;

CREATE POLICY "partners_select_org" ON public.partners
  FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id());

CREATE POLICY "partners_insert_org" ON public.partners
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id());

CREATE POLICY "partners_update_org" ON public.partners
  FOR UPDATE TO authenticated
  USING (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id());

CREATE POLICY "partners_delete_org" ON public.partners
  FOR DELETE TO authenticated
  USING (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id());

ALTER TABLE public.project_partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_partners_select_org" ON public.project_partners;
DROP POLICY IF EXISTS "project_partners_insert_org" ON public.project_partners;
DROP POLICY IF EXISTS "project_partners_update_org" ON public.project_partners;
DROP POLICY IF EXISTS "project_partners_delete_org" ON public.project_partners;

CREATE POLICY "project_partners_select_org" ON public.project_partners
  FOR SELECT TO authenticated
  USING (
    (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id())
    OR project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id())
  );

CREATE POLICY "project_partners_insert_org" ON public.project_partners
  FOR INSERT TO authenticated
  WITH CHECK (
    (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id())
    OR project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id())
  );

CREATE POLICY "project_partners_update_org" ON public.project_partners
  FOR UPDATE TO authenticated
  USING (
    (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id())
    OR project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id())
  );

CREATE POLICY "project_partners_delete_org" ON public.project_partners
  FOR DELETE TO authenticated
  USING (
    (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id())
    OR project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id())
  );

ALTER TABLE public.partner_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partner_tx_select_org" ON public.partner_transactions;
DROP POLICY IF EXISTS "partner_tx_insert_org" ON public.partner_transactions;
DROP POLICY IF EXISTS "partner_tx_update_org" ON public.partner_transactions;
DROP POLICY IF EXISTS "partner_tx_delete_org" ON public.partner_transactions;

CREATE POLICY "partner_tx_select_org" ON public.partner_transactions
  FOR SELECT TO authenticated
  USING (
    (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id())
    OR partner_id IN (SELECT id FROM public.partners WHERE organization_id = public.get_user_organization_id())
  );

CREATE POLICY "partner_tx_insert_org" ON public.partner_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id())
    OR partner_id IN (SELECT id FROM public.partners WHERE organization_id = public.get_user_organization_id())
  );

CREATE POLICY "partner_tx_update_org" ON public.partner_transactions
  FOR UPDATE TO authenticated
  USING (
    (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id())
    OR partner_id IN (SELECT id FROM public.partners WHERE organization_id = public.get_user_organization_id())
  );

CREATE POLICY "partner_tx_delete_org" ON public.partner_transactions
  FOR DELETE TO authenticated
  USING (
    (organization_id IS NOT NULL AND organization_id = public.get_user_organization_id())
    OR partner_id IN (SELECT id FROM public.partners WHERE organization_id = public.get_user_organization_id())
  );
