-- ============================================================
-- PillarPro v2 — Migration 039: Auto-Activate Firm Owners on Sign-up
--
-- Updates handle_new_user() trigger function so that when a user
-- registers with a 'firm_name' in their raw_user_meta_data, they
-- are automatically provisioned with an organization, assigned the
-- 'owner' role, and set to 'active' status instead of 'pending'.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_firm_name TEXT;
  v_display_name TEXT;
  v_org_id UUID;
BEGIN
  v_firm_name := TRIM(COALESCE(NEW.raw_user_meta_data->>'firm_name', ''));
  v_display_name := TRIM(COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));

  -- If firm_name is provided in user_metadata, auto-create organization and activate as owner
  IF v_firm_name <> '' THEN
    INSERT INTO public.organizations (name, legal_name, registration_no, email)
    VALUES (v_firm_name, v_firm_name, 'Class-A Govt Contractor, PWD / PMGSY', NEW.email)
    RETURNING id INTO v_org_id;

    INSERT INTO public.user_profiles (id, email, display_name, status, organization_id)
    VALUES (NEW.id, NEW.email, v_display_name, 'active', v_org_id)
    ON CONFLICT (id) DO UPDATE SET
      status = 'active',
      organization_id = v_org_id,
      display_name = v_display_name;

    INSERT INTO public.roles (user_id, role)
    VALUES (NEW.id, 'owner')
    ON CONFLICT (user_id) DO UPDATE SET role = 'owner';
  ELSE
    INSERT INTO public.user_profiles (id, email, display_name, status)
    VALUES (NEW.id, NEW.email, v_display_name, 'pending')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
