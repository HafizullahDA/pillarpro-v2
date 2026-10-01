-- ==============================================================================
-- Migration: 065_exclusive_visitor_telemetry_and_stay_duration.sql
-- Description: Platform owner visitor telemetry & stay duration tracking.
--              Strictly reserved and exclusive for pillarprojk@gmail.com only.
-- ==============================================================================

-- 1. Ensure Table: visitor_sessions exists with all required columns
CREATE TABLE IF NOT EXISTS public.visitor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  visitor_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  entry_path TEXT NOT NULL DEFAULT '/',
  last_path TEXT NOT NULL DEFAULT '/',
  referrer TEXT,
  device_type TEXT NOT NULL DEFAULT 'desktop',
  browser TEXT,
  os TEXT,
  city TEXT,
  country TEXT,
  ip_address TEXT,
  user_email TEXT,
  user_name TEXT,
  org_name TEXT,
  pageviews INTEGER NOT NULL DEFAULT 1,
  is_bounce BOOLEAN NOT NULL DEFAULT TRUE,
  journey JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance indices
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_started_at ON public.visitor_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_last_active_at ON public.visitor_sessions(last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_visitor_id ON public.visitor_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_user_email ON public.visitor_sessions(user_email);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;

-- Drop all legacy policies
DROP POLICY IF EXISTS "Only platform admins can view visitor logs" ON public.visitor_sessions;
DROP POLICY IF EXISTS "Exclusive platform owner can view visitor logs" ON public.visitor_sessions;
DROP POLICY IF EXISTS "visitor_sessions_owner_select" ON public.visitor_sessions;

-- Policy: Strictly EXCLUSIVE to pillarprojk@gmail.com
CREATE POLICY "Exclusive platform owner can view visitor logs"
  ON public.visitor_sessions
  FOR SELECT
  TO authenticated
  USING (
    LOWER(COALESCE(auth.jwt() ->> 'email', auth.email(), '')) = 'pillarprojk@gmail.com'
    OR EXISTS (
      SELECT 1 FROM auth.users WHERE id = auth.uid() AND LOWER(email) = 'pillarprojk@gmail.com'
    )
  );

-- 3. Telemetry Ingestion Function (SECURITY DEFINER allows background telemetry from anon & users)
CREATE OR REPLACE FUNCTION public.track_visitor_session(
  p_session_id TEXT,
  p_visitor_id TEXT,
  p_path TEXT,
  p_referrer TEXT DEFAULT NULL,
  p_device_type TEXT DEFAULT 'desktop',
  p_browser TEXT DEFAULT NULL,
  p_os TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_email TEXT DEFAULT NULL,
  p_user_name TEXT DEFAULT NULL,
  p_org_name TEXT DEFAULT NULL,
  p_duration_increment INTEGER DEFAULT 0,
  p_is_heartbeat BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_journey_item JSONB;
BEGIN
  -- Construct journey trace record
  v_journey_item := jsonb_build_object(
    'path', p_path,
    'at', NOW(),
    'is_heartbeat', p_is_heartbeat,
    'added_seconds', GREATEST(0, p_duration_increment)
  );

  -- Try to update existing session
  UPDATE public.visitor_sessions
  SET
    last_active_at = NOW(),
    duration_seconds = duration_seconds + GREATEST(0, p_duration_increment),
    last_path = CASE WHEN NOT p_is_heartbeat THEN p_path ELSE last_path END,
    pageviews = CASE WHEN NOT p_is_heartbeat AND last_path <> p_path THEN pageviews + 1 ELSE pageviews END,
    is_bounce = CASE WHEN NOT p_is_heartbeat AND last_path <> p_path THEN FALSE ELSE is_bounce END,
    user_email = COALESCE(p_user_email, user_email),
    user_name = COALESCE(p_user_name, user_name),
    org_name = COALESCE(p_org_name, org_name),
    city = COALESCE(p_city, city),
    country = COALESCE(p_country, country),
    ip_address = COALESCE(p_ip_address, ip_address),
    browser = COALESCE(p_browser, browser),
    os = COALESCE(p_os, os),
    journey = CASE 
      WHEN NOT p_is_heartbeat THEN (COALESCE(journey, '[]'::jsonb) || jsonb_build_array(v_journey_item))
      ELSE journey 
    END,
    updated_at = NOW()
  WHERE session_id = p_session_id;

  IF NOT FOUND THEN
    -- Insert fresh session
    INSERT INTO public.visitor_sessions (
      session_id,
      visitor_id,
      started_at,
      last_active_at,
      duration_seconds,
      entry_path,
      last_path,
      referrer,
      device_type,
      browser,
      os,
      city,
      country,
      ip_address,
      user_email,
      user_name,
      org_name,
      pageviews,
      is_bounce,
      journey
    ) VALUES (
      p_session_id,
      p_visitor_id,
      NOW(),
      NOW(),
      GREATEST(0, p_duration_increment),
      p_path,
      p_path,
      p_referrer,
      p_device_type,
      p_browser,
      p_os,
      p_city,
      p_country,
      p_ip_address,
      p_user_email,
      p_user_name,
      p_org_name,
      1,
      TRUE,
      jsonb_build_array(v_journey_item)
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'session_id', p_session_id);
END;
$$;

-- Grant execution to anon (for landing page visitors) and authenticated users
GRANT EXECUTE ON FUNCTION public.track_visitor_session TO anon, authenticated, service_role;
