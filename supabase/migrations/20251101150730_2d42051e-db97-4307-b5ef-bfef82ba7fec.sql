-- PHASE 6.1: Critical RLS Security Fixes
-- Fix public access vulnerabilities on sensitive tables

-- ============================================
-- 1. SECURE unified_metrics TABLE
-- ============================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Public read access" ON unified_metrics;
DROP POLICY IF EXISTS "Anyone can read unified metrics" ON unified_metrics;
DROP POLICY IF EXISTS "Users can read own metrics" ON unified_metrics;
DROP POLICY IF EXISTS "Trainers can read client metrics" ON unified_metrics;
DROP POLICY IF EXISTS "Users can insert own metrics" ON unified_metrics;
DROP POLICY IF EXISTS "Users can update own metrics" ON unified_metrics;

-- Create secure policies
CREATE POLICY "Users can read own metrics"
  ON unified_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Trainers can read client metrics"
  ON unified_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trainer_clients
      WHERE trainer_id = auth.uid()
        AND client_id = unified_metrics.user_id
        AND active = true
    )
  );

CREATE POLICY "Users can insert own metrics"
  ON unified_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own metrics"
  ON unified_metrics FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- 2. SECURE metric_confidence_cache TABLE
-- ============================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Public read access" ON metric_confidence_cache;
DROP POLICY IF EXISTS "Anyone can read confidence cache" ON metric_confidence_cache;
DROP POLICY IF EXISTS "Users can read own cache" ON metric_confidence_cache;
DROP POLICY IF EXISTS "Trainers can read client cache" ON metric_confidence_cache;

-- Create secure policies
CREATE POLICY "Users can read own cache"
  ON metric_confidence_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Trainers can read client cache"
  ON metric_confidence_cache FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trainer_clients
      WHERE trainer_id = auth.uid()
        AND client_id = metric_confidence_cache.user_id
        AND active = true
    )
  );

-- ============================================
-- 3. SECURE idempotency_keys TABLE
-- ============================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Public access" ON idempotency_keys;
DROP POLICY IF EXISTS "Anyone can access idempotency keys" ON idempotency_keys;
DROP POLICY IF EXISTS "Service role only" ON idempotency_keys;

-- Create secure policy
CREATE POLICY "Service role only"
  ON idempotency_keys
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- 4. ADD PERFORMANCE INDEXES
-- ============================================

-- Index for unified_metrics lookups (user_id + measurement_date)
CREATE INDEX IF NOT EXISTS idx_unified_metrics_user_date 
  ON unified_metrics(user_id, measurement_date DESC);

-- Index for metric_confidence_cache lookups
CREATE INDEX IF NOT EXISTS idx_metric_confidence_user_metric 
  ON metric_confidence_cache(user_id, metric_name);

-- Index for terra_tokens user lookups
CREATE INDEX IF NOT EXISTS idx_terra_tokens_user
  ON terra_tokens(user_id);

-- Index for trainer_clients JOINs
CREATE INDEX IF NOT EXISTS idx_trainer_clients_active 
  ON trainer_clients(trainer_id, client_id) 
  WHERE active = true;

-- Index for background_jobs processing
CREATE INDEX IF NOT EXISTS idx_background_jobs_status_created
  ON background_jobs(status, created_at)
  WHERE status IN ('pending', 'processing');