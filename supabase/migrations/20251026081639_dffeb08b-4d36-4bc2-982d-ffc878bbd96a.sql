-- Phase 1: Edge Functions Infrastructure
-- Tables for shared utilities: idempotency, background jobs, logging, webhooks

-- =====================================================
-- 1. Idempotency Keys Table
-- =====================================================
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_key ON idempotency_keys(key);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created ON idempotency_keys(created_at);

-- Cleanup function for old idempotency keys (keep 7 days)
CREATE OR REPLACE FUNCTION cleanup_idempotency_keys()
RETURNS void AS $$
BEGIN
  DELETE FROM idempotency_keys
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. Background Jobs Table
-- =====================================================
CREATE TABLE IF NOT EXISTS background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payload JSONB NOT NULL,
  result JSONB,
  error TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON background_jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON background_jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled ON background_jobs(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON background_jobs(created_at DESC);

-- Cleanup function for old jobs (keep 7 days)
CREATE OR REPLACE FUNCTION cleanup_background_jobs()
RETURNS void AS $$
BEGIN
  DELETE FROM background_jobs
  WHERE status IN ('completed', 'failed')
    AND completed_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. Edge Function Logs Table
-- =====================================================
CREATE TABLE IF NOT EXISTS edge_function_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  function_name TEXT NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMPTZ NOT NULL,
  request_id TEXT,
  user_id UUID,
  duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_function_logs_function ON edge_function_logs(function_name);
CREATE INDEX IF NOT EXISTS idx_function_logs_level ON edge_function_logs(level);
CREATE INDEX IF NOT EXISTS idx_function_logs_timestamp ON edge_function_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_function_logs_user ON edge_function_logs(user_id);

-- Cleanup function for old logs (keep 30 days)
CREATE OR REPLACE FUNCTION cleanup_edge_function_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM edge_function_logs
  WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. Terra Webhooks Raw Table
-- =====================================================
CREATE TABLE IF NOT EXISTS terra_webhooks_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id TEXT UNIQUE,
  type TEXT NOT NULL,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  processed_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_terra_webhooks_user ON terra_webhooks_raw(user_id);
CREATE INDEX IF NOT EXISTS idx_terra_webhooks_status ON terra_webhooks_raw(status);
CREATE INDEX IF NOT EXISTS idx_terra_webhooks_created ON terra_webhooks_raw(created_at DESC);

-- Cleanup function for old webhooks (keep 7 days)
CREATE OR REPLACE FUNCTION cleanup_terra_webhooks()
RETURNS void AS $$
BEGIN
  DELETE FROM terra_webhooks_raw
  WHERE created_at < NOW() - INTERVAL '7 days'
    AND status = 'completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. Update metric_values with external_id for deduplication
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'metric_values' AND column_name = 'external_id'
  ) THEN
    ALTER TABLE metric_values ADD COLUMN external_id TEXT UNIQUE;
    CREATE INDEX idx_metric_values_external_id ON metric_values(external_id);
  END IF;
END $$;