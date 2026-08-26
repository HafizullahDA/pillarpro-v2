-- ============================================================
-- PillarPro v2 — Migration 005: Grant Table Permissions to Authenticated Role
-- Fixes error 42501 (permission denied): Missing base table grants were blocking
-- RLS policies from being evaluated for authenticated users.
-- ============================================================

GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.roles TO authenticated;
GRANT SELECT ON public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
