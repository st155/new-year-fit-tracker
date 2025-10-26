-- Fix security warnings from Phase 7 migration

-- 1. Hide materialized view from API (WARN: Materialized View in API)
REVOKE ALL ON public.latest_unified_metrics FROM anon, authenticated;

-- Grant access only to service role for internal queries
GRANT SELECT ON public.latest_unified_metrics TO service_role;

-- 2. Add missing policy for rate_limits (INFO: RLS Enabled No Policy is acceptable here)
-- rate_limits already has the "rate_limits_public" policy for public access

-- 3. Ensure background_jobs_dlq has proper comment
COMMENT ON TABLE public.background_jobs_dlq IS 'Dead Letter Queue for failed background jobs after max retries';