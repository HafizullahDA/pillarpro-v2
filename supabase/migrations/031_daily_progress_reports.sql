-- ============================================================
-- PillarPro v2 — Migration 031: Daily Progress Reports (DPR) & Site Photo Diary
-- Multi-tenant daily site diary, weather delays, manpower logs, and photo carousels
-- ============================================================

-- 1. Create weather condition enum
DO $$ BEGIN
  CREATE TYPE weather_condition AS ENUM ('sunny_clear', 'overcast_cloudy', 'rain_drizzle', 'heavy_rain_halt', 'extreme_heat', 'fog_cold');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create DPR status enum
DO $$ BEGIN
  CREATE TYPE dpr_status AS ENUM ('draft', 'submitted', 'verified');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. Create daily_progress_reports table
CREATE TABLE IF NOT EXISTS public.daily_progress_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weather weather_condition NOT NULL DEFAULT 'sunny_clear',
  work_completed_notes TEXT NOT NULL,
  impediments_delays TEXT,
  total_manpower_count INTEGER DEFAULT 0,
  masons_count INTEGER DEFAULT 0,
  labourers_count INTEGER DEFAULT 0,
  machinery_active_count INTEGER DEFAULT 0,
  photos JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { url: string, caption?: string, taken_at?: string }
  status dpr_status NOT NULL DEFAULT 'submitted',
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_project_dpr_date UNIQUE (project_id, report_date)
);

-- Indices for rapid queries by organization, project, and date
CREATE INDEX IF NOT EXISTS idx_dpr_org ON public.daily_progress_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_dpr_project_date ON public.daily_progress_reports(project_id, report_date DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.daily_progress_reports ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "dpr_org_select"
ON public.daily_progress_reports FOR SELECT
TO authenticated
USING (
  organization_id = public.get_user_organization_id()
);

CREATE POLICY "dpr_org_insert"
ON public.daily_progress_reports FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = public.get_user_organization_id()
  AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'site_supervisor')
);

CREATE POLICY "dpr_org_update"
ON public.daily_progress_reports FOR UPDATE
TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'site_supervisor')
)
WITH CHECK (
  organization_id = public.get_user_organization_id()
);

CREATE POLICY "dpr_org_delete"
ON public.daily_progress_reports FOR DELETE
TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.get_user_role() IN ('owner', 'managing_partner')
);

-- 6. Permissions Grant
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_progress_reports TO authenticated;

