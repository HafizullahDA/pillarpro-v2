-- ============================================================
-- PillarPro v2 — Migration 066: Fix Auth User Deletion & FK Cascades
-- 
-- Fixes:
-- 1. "ERROR: insert or update on table violates foreign key constraint (key is not present in table users)"
-- 2. "Failed to delete user: Database error deleting user" in Supabase Auth
-- 
-- Cause:
-- - Historical seed data (e.g. demo user 'd0000000-0000-4000-a000-000000000002')
--   left orphaned created_by references in tables like 'ledger', 'projects', etc.
-- - Foreign key constraints lacked ON DELETE SET NULL / ON DELETE CASCADE.
--
-- Solution:
-- 1. Cleans up (nullifies) any orphaned references to deleted or non-existent users.
-- 2. Drops restrictive foreign keys and re-adds them with ON DELETE CASCADE (for profiles/roles)
--    and ON DELETE SET NULL (for audit/author columns).
-- ============================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  -- 1. Loop through every foreign key constraint referencing auth.users(id)
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
      -- A. Drop the existing constraint
      EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', r.tbl, r.constraint_name);

      -- B. Clean up orphaned user IDs before re-adding constraint
      IF r.tbl IN ('public.user_profiles', 'public.roles', 'public.project_members') THEN
        -- Delete orphaned profile/role rows for users that don't exist in auth.users
        EXECUTE format('DELETE FROM %s WHERE %I IS NOT NULL AND %I NOT IN (SELECT id FROM auth.users)',
                       r.tbl, r.col_name, r.col_name);

        -- Re-add with ON DELETE CASCADE
        EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth.users(id) ON DELETE CASCADE',
                       r.tbl, r.constraint_name, r.col_name);
        RAISE NOTICE 'Updated % (%I) -> ON DELETE CASCADE', r.tbl, r.col_name;
      ELSE
        -- Ensure author/audit column is nullable so SET NULL never fails
        EXECUTE format('ALTER TABLE %s ALTER COLUMN %I DROP NOT NULL', r.tbl, r.col_name);

        -- Nullify any orphaned user IDs (e.g. old demo IDs like d0000000-0000-4000-a000-000000000002)
        EXECUTE format('UPDATE %s SET %I = NULL WHERE %I IS NOT NULL AND %I NOT IN (SELECT id FROM auth.users)',
                       r.tbl, r.col_name, r.col_name, r.col_name);

        -- Re-add with ON DELETE SET NULL
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
