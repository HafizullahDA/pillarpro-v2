-- ============================================================
-- PillarPro v2 — Migration 066: Fix Auth User Deletion & FK Cascades
-- 
-- Fixes: "Failed to delete user: Database error deleting user" in Supabase Auth
-- 
-- Cause:
-- PostgreSQL tables (projects, bills, expenses, ledger, contracts, etc.)
-- had foreign keys referencing auth.users(id) with default ON DELETE NO ACTION.
-- When deleting a user in Supabase Studio, PostgreSQL aborted the deletion
-- because foreign key constraints were violated.
--
-- Solution:
-- 1. Updates user identity tables (user_profiles, roles, project_members)
--    to ON DELETE CASCADE.
-- 2. Updates all audit/created_by/updated_by columns to ON DELETE SET NULL
--    (and ensures those columns are nullable).
-- 3. Provides dynamic SQL to safely patch any custom or future tables.
-- ============================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Loop through every foreign key constraint referencing auth.users(id)
  FOR r IN
    SELECT
      c.conrelid::regclass::text AS tbl,
      c.conname AS constraint_name,
      a.attname AS col_name,
      c.confdeltype AS del_type
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
    WHERE c.confrelid = 'auth.users'::regclass
      AND c.contype = 'f'
  LOOP
    -- If constraint is not already CASCADE ('c') or SET NULL ('n')
    IF r.del_type NOT IN ('c', 'n') THEN
      -- Drop the restrictive constraint
      EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', r.tbl, r.constraint_name);

      -- Identity & membership tables should CASCADE delete with the user
      IF r.tbl IN ('public.user_profiles', 'public.roles', 'public.project_members') THEN
        EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth.users(id) ON DELETE CASCADE',
                       r.tbl, r.constraint_name, r.col_name);
        RAISE NOTICE 'Updated % (%I) -> ON DELETE CASCADE', r.tbl, r.col_name;
      ELSE
        -- Ensure author/audit column is nullable so SET NULL never fails
        EXECUTE format('ALTER TABLE %s ALTER COLUMN %I DROP NOT NULL', r.tbl, r.col_name);
        -- Re-add with ON DELETE SET NULL so historical records are preserved
        EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth.users(id) ON DELETE SET NULL',
                       r.tbl, r.constraint_name, r.col_name);
        RAISE NOTICE 'Updated % (%I) -> ON DELETE SET NULL', r.tbl, r.col_name;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- Helper RPC: Admin Force Delete User by Email or ID (Optional)
-- Run this in SQL Editor if you ever need to purge test accounts programmatically
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_delete_user_by_email(p_email TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid UUID;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE LOWER(email) = LOWER(p_email);
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not found: ' || p_email);
  END IF;

  DELETE FROM auth.users WHERE id = v_uid;
  RETURN json_build_object('success', true, 'message', 'User deleted: ' || p_email, 'user_id', v_uid);
END;
$$;
