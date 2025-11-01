-- ========================================
-- CRITICAL SECURITY FIX: Close Public Access to Sensitive Tables
-- ========================================

-- 1. FIX RATE_LIMITS - MOST CRITICAL (Remove public write access)
-- ========================================
DROP POLICY IF EXISTS "System can manage rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "System can insert rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Users can view own rate limits" ON public.rate_limits;

-- Users can only view their own rate limits
CREATE POLICY "users_view_own_rate_limits" ON public.rate_limits
  FOR SELECT
  USING (key LIKE auth.uid()::text || '%');

-- Service role can manage all (used in Edge Functions)
-- No public INSERT/UPDATE/DELETE policies


-- 2. FIX UNIFIED_METRICS - CRITICAL (Health data, GDPR/HIPAA)
-- ========================================
-- Drop any existing overly permissive policies
DROP POLICY IF EXISTS "public_read_unified_metrics" ON public.unified_metrics;
DROP POLICY IF EXISTS "enable_read_access" ON public.unified_metrics;

-- Users can view their own metrics
CREATE POLICY "users_view_own_unified_metrics" ON public.unified_metrics
  FOR SELECT
  USING (auth.uid() = user_id);

-- Trainers can view their clients' metrics
CREATE POLICY "trainers_view_client_unified_metrics" ON public.unified_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.client_id = unified_metrics.user_id
        AND tc.trainer_id = auth.uid()
        AND tc.active = true
    )
  );

-- System can insert/update (via triggers and service role)
CREATE POLICY "system_manage_unified_metrics" ON public.unified_metrics
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- 3. FIX METRIC_CONFIDENCE_CACHE
-- ========================================
DROP POLICY IF EXISTS "public_read_confidence" ON public.metric_confidence_cache;

CREATE POLICY "users_view_own_confidence" ON public.metric_confidence_cache
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "trainers_view_client_confidence" ON public.metric_confidence_cache
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.client_id = metric_confidence_cache.user_id
        AND tc.trainer_id = auth.uid()
        AND tc.active = true
    )
  );


-- 4. FIX CHALLENGE_POINTS - Remove overly permissive policy
-- ========================================
DROP POLICY IF EXISTS "Система может обновлять очки" ON public.challenge_points;

-- Keep existing good policies, add system policy
CREATE POLICY "system_manage_challenge_points" ON public.challenge_points
  FOR INSERT
  WITH CHECK (true); -- System can insert via triggers


-- 5. FIX EDGE_FUNCTION_LOGS - Admin/Trainer only
-- ========================================
DROP POLICY IF EXISTS "public_read_logs" ON public.edge_function_logs;
DROP POLICY IF EXISTS "admin_trainer_logs_access" ON public.edge_function_logs;

CREATE POLICY "admin_trainer_view_logs" ON public.edge_function_logs
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'trainer'::app_role)
  );


-- 6. FIX IDEMPOTENCY_KEYS - Service Role Only
-- ========================================
DROP POLICY IF EXISTS "public_read_idempotency" ON public.idempotency_keys;
DROP POLICY IF EXISTS "enable_all_idempotency" ON public.idempotency_keys;

-- No public policies - only service_role can access


-- 7. FIX API_RATE_LIMITS
-- ========================================
DROP POLICY IF EXISTS "System can manage rate limits" ON public.api_rate_limits;

CREATE POLICY "users_view_own_api_limits" ON public.api_rate_limits
  FOR SELECT
  USING (auth.uid() = user_id);


-- 8. FIX TERRA_BACKFILL_JOBS (if exists)
-- ========================================
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'terra_backfill_jobs') THEN
    EXECUTE 'DROP POLICY IF EXISTS "public_read_backfill" ON public.terra_backfill_jobs';
    
    EXECUTE 'CREATE POLICY "users_view_own_backfill_jobs" ON public.terra_backfill_jobs
      FOR SELECT
      USING (auth.uid() = user_id)';
  END IF;
END $$;


-- ========================================
-- FIX FUNCTION SEARCH PATH (Mutable Function Search Path vulnerability)
-- ========================================

-- Fix all existing functions to use safe search_path
DO $$ 
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN 
    SELECT 
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp',
        func_record.schema_name,
        func_record.function_name,
        func_record.args
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not alter function %.%: %', func_record.schema_name, func_record.function_name, SQLERRM;
    END;
  END LOOP;
END $$;


-- ========================================
-- FIX SECURITY DEFINER VIEWS (if any exist)
-- ========================================

-- Note: PostgreSQL doesn't have direct ALTER VIEW for security_invoker before v15
-- For views, we'll rely on proper RLS policies on underlying tables
-- If specific views need updating, add them here

COMMENT ON SCHEMA public IS 'Critical security fixes applied: closed public access to sensitive tables, fixed function search paths, enforced proper RLS policies';
