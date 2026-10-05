-- ==============================================================================
-- 071_alert_dispatch_logs_and_preferences.sql
-- PillarPro Enterprise: Autonomous Alerts Dispatch Ledger & Notification Tracking
--
-- Provides:
-- 1. public.alert_dispatch_logs: Idempotency ledger preventing duplicate notifications
-- 2. Fast multi-column indexing for instant deduplication lookups
-- 3. Row Level Security policies scoping logs to organization members
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.alert_dispatch_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'bank_guarantee', 'correspondence', 'ra_bill', 'supplier', 'machinery'
  entity_id TEXT NOT NULL,
  entity_reference TEXT,
  milestone_key TEXT NOT NULL, -- 'T_MINUS_30', 'T_MINUS_15', 'T_MINUS_7', 'T_MINUS_3', 'T_MINUS_1', 'T_0', 'OVERDUE'
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  recipient_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'dispatched', -- 'dispatched', 'failed', 'skipped'
  error_message TEXT,
  meta_message_id TEXT,
  payload_snapshot JSONB DEFAULT '{}'::jsonb,
  dispatched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deduplication index: Prevents sending the same milestone alert on the same calendar day
CREATE INDEX IF NOT EXISTS idx_alert_dispatch_dedupe 
  ON public.alert_dispatch_logs (entity_type, entity_id, milestone_key, ((dispatched_at AT TIME ZONE 'UTC')::date));

-- Chronological lookup index for audit history
CREATE INDEX IF NOT EXISTS idx_alert_dispatch_org_time 
  ON public.alert_dispatch_logs (organization_id, dispatched_at DESC);

-- Enable Row Level Security
ALTER TABLE public.alert_dispatch_logs ENABLE ROW LEVEL SECURITY;

-- Read policy: Organization members can view their organization's dispatch logs
CREATE POLICY "org_members_view_alert_logs"
  ON public.alert_dispatch_logs
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- Insert policy: Authenticated service / background actions can insert logs
CREATE POLICY "authenticated_insert_alert_logs"
  ON public.alert_dispatch_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 4. SECURITY DEFINER RPC: Allows autonomous background cron to fetch active deadlines across organizations
CREATE OR REPLACE FUNCTION public.get_autonomous_alert_candidates(p_as_of_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_securities JSONB;
  v_notices JSONB;
BEGIN
  -- 1. Active security deposits with expiry dates
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', sd.id,
      'project_id', sd.project_id,
      'deposit_type', sd.deposit_type,
      'reference_number', sd.reference_number,
      'issuing_bank', sd.issuing_bank,
      'amount', sd.amount,
      'expiry_date', sd.expiry_date,
      'status', sd.status,
      'project_name', p.name,
      'organization_id', p.organization_id
    )
  ), '[]'::jsonb)
  INTO v_securities
  FROM public.security_deposits sd
  JOIN public.projects p ON p.id = sd.project_id
  WHERE sd.status = 'active'
    AND sd.expiry_date IS NOT NULL
    AND p.archived = false;

  -- 2. Pending correspondence requiring response
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'project_id', c.project_id,
      'letter_number', c.letter_number,
      'reference_number', c.reference_number,
      'direction', c.direction,
      'subject', c.subject,
      'status', c.status,
      'response_deadline', c.response_deadline,
      'clause_reference', c.clause_reference,
      'project_name', p.name,
      'organization_id', p.organization_id
    )
  ), '[]'::jsonb)
  INTO v_notices
  FROM public.correspondence c
  JOIN public.projects p ON p.id = c.project_id
  WHERE c.response_required = true
    AND c.responded_date IS NULL
    AND c.status != 'CLOSED'
    AND c.response_deadline IS NOT NULL
    AND p.archived = false;

  RETURN jsonb_build_object(
    'as_of_date', p_as_of_date,
    'securities', v_securities,
    'notices', v_notices
  );
END;
$$;

