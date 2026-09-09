# PillarPro Production Backup & Rollback Playbook

This document defines the deployment safety guidelines, pre-deployment snapshot routines, and rollback procedures for PillarPro.

---

## 1. Dual-Layer Rollback Architecture

PillarPro consists of two distinct tiers:
1. **Frontend / Server Actions (Vercel)**: Stateless Next.js runtime.
2. **Database & Storage (Supabase Postgres)**: State-dependent relational data (expenses, bills, muster rolls, transactions).

> [!WARNING]
> Rolling back a commit in Vercel **does not** roll back database schema changes, deleted columns, or altered data tables in Supabase. You must follow the database migration rules below.

---

## 2. Pre-Deployment Checklist

Before deploying any branch that includes files under `supabase/migrations/`:

1. **Verify environment cleanliness**:
   ```bash
   npm run check-env
   ```
2. **Take a database snapshot**:
   Run the pre-deploy backup script:
   ```powershell
   .\scripts\backup-db.ps1
   ```
   Or via Supabase CLI directly:
   ```bash
   npx supabase db dump -f backups/pre_deploy_$(date +%Y%m%d).sql
   ```
3. **Verify Forward-Compatibility (Expand & Contract)**:
   - **Step 1 (Expand)**: Add new columns as `NULLABLE` or with default values. Do not drop old columns yet.
   - **Step 2 (Deploy Code)**: Deploy the updated Next.js application that reads/writes the new structure.
   - **Step 3 (Contract)**: After verifying production stability, apply constraints or remove deprecated columns in a subsequent release.

---

## 3. Emergency Rollback Procedures

### Scenario A: Frontend Bug (No DB changes)
If a bad UI commit is pushed to production without database schema changes:
1. Go to **Vercel Dashboard** → **Deployments**.
2. Locate the last known good deployment.
3. Click **Instant Rollback** (or Redeploy).
4. The site rolls back in < 15 seconds.

### Scenario B: Database Schema Failure or RLS Lockout
If a migration introduces a locking bug or breaks an RLS policy:
1. Identify the offending migration file in `supabase/migrations/` (e.g. `019_organizations_schema.sql`).
2. Run the corresponding down-statement in the Supabase SQL Editor:
   ```sql
   -- Example Rollback for 019:
   DROP POLICY IF EXISTS "Active users can manage organizations" ON public.organizations;
   DROP TABLE IF EXISTS public.organizations;
   ```
3. If data corruption occurred, restore from the pre-deployment snapshot:
   - Supabase Dashboard → **Database** → **Backups** → **Point in Time Recovery (PITR)**.
   - Select the timestamp immediately prior to migration execution.
   - Click **Restore to this point**.

---

## 4. Automated Backup Recommendation (Supabase Cloud)

For production, ensure the following are enabled in Supabase Project Settings:
- **Daily Automated Backups**: Retained for 7 to 30 days depending on plan.
- **Point-In-Time-Recovery (PITR)**: Enables rolling back database state to any minute in the last 7 days.

