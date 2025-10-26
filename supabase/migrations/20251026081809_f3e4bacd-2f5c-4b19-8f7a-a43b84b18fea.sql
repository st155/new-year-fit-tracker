-- Fix security warnings from Phase 1 migration

-- =====================================================
-- Enable RLS on new tables
-- =====================================================
-- These are service tables, only accessible via Edge Functions with service_role key

ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE edge_function_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE terra_webhooks_raw ENABLE ROW LEVEL SECURITY;

-- No policies needed - these tables should ONLY be accessed by Edge Functions
-- with service_role key, not by regular users through PostgREST

-- =====================================================
-- Fix search_path for cleanup functions
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_idempotency_keys()
RETURNS void AS $$
BEGIN
  DELETE FROM idempotency_keys
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION cleanup_background_jobs()
RETURNS void AS $$
BEGIN
  DELETE FROM background_jobs
  WHERE status IN ('completed', 'failed')
    AND completed_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION cleanup_edge_function_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM edge_function_logs
  WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION cleanup_terra_webhooks()
RETURNS void AS $$
BEGIN
  DELETE FROM terra_webhooks_raw
  WHERE created_at < NOW() - INTERVAL '7 days'
    AND status = 'completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;