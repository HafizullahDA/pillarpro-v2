-- ============================================================
-- PillarPro v2 — Migration 011: Project Archive / Soft Delete
-- Adds soft-delete archiving columns to public.projects
-- Restricts archiving and unarchiving to Owner role only
-- Safe to run in Supabase SQL Editor (idempotent).
-- ============================================================

-- 1. Add archive columns to public.projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id);

-- 2. Index for filtering active vs archived projects efficiently
CREATE INDEX IF NOT EXISTS idx_projects_archived ON public.projects(archived);

-- 3. Guard trigger: Enforce that only 'owner' can change the archived state
CREATE OR REPLACE FUNCTION public.guard_project_archive_and_core_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Only Owner can archive or unarchive projects
  IF (OLD.archived IS DISTINCT FROM NEW.archived) AND (public.get_user_role() <> 'owner') THEN
    RAISE EXCEPTION 'Only users with the Owner role can archive or unarchive projects.';
  END IF;

  -- Managing Partners cannot edit core financial/agency fields
  IF public.get_user_role() = 'managing_partner' THEN
    IF (OLD.agency_name     IS DISTINCT FROM NEW.agency_name)     OR
       (OLD.advertised_cost IS DISTINCT FROM NEW.advertised_cost) OR
       (OLD.awarded_amount  IS DISTINCT FROM NEW.awarded_amount)  THEN
      RAISE EXCEPTION
        'Managing Partners cannot edit core project fields (agency, advertised cost, awarded amount).';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_project_core_fields ON public.projects;

CREATE TRIGGER trg_guard_project_core_fields
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_project_archive_and_core_fields();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.projects TO authenticated;
