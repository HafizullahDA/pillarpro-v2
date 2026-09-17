-- ============================================================
-- PillarPro v2 — Migration 029: Remove Team Member RPC & RLS
-- Allows firm owners to safely remove staff members from their organization.
-- ============================================================

-- 1. Create atomic RPC to remove a team member
CREATE OR REPLACE FUNCTION public.remove_team_member(p_user_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_role TEXT;
  v_caller_org_id UUID;
  v_target_org_id UUID;
  v_target_email TEXT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  -- Verify caller is Owner or Managing Partner
  v_caller_role := public.get_user_role();
  IF v_caller_role NOT IN ('owner', 'managing_partner') THEN
    RAISE EXCEPTION 'Unauthorized: Only the Owner can remove team members.';
  END IF;

  -- Caller cannot remove themselves
  IF p_user_id = v_caller_id THEN
    RAISE EXCEPTION 'Cannot remove your own account from the firm.';
  END IF;

  -- Verify target belongs to caller's organization
  v_caller_org_id := public.get_user_organization_id();
  IF v_caller_org_id IS NULL THEN
    RAISE EXCEPTION 'Caller is not associated with any organization.';
  END IF;

  SELECT organization_id, email INTO v_target_org_id, v_target_email
  FROM public.user_profiles
  WHERE id = p_user_id;

  IF v_target_org_id IS DISTINCT FROM v_caller_org_id THEN
    RAISE EXCEPTION 'Team member does not belong to your organization.';
  END IF;

  -- 1. Remove project assignments for this firm's projects
  DELETE FROM public.project_members
  WHERE user_id = p_user_id
    AND project_id IN (
      SELECT id FROM public.projects WHERE organization_id = v_caller_org_id
    );

  -- 2. Reset user role to viewer
  UPDATE public.roles
  SET role = 'viewer', project_id = NULL
  WHERE user_id = p_user_id;

  -- 3. Unlink user from organization and mark pending
  UPDATE public.user_profiles
  SET organization_id = NULL,
      status = 'pending',
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'removed_user_id', p_user_id,
    'email', v_target_email
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_team_member(UUID) TO authenticated;

