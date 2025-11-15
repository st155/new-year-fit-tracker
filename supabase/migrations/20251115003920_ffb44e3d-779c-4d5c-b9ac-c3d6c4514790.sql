-- Phase 2: Security Hardening Migration (Simple)
-- Drop dangerous and duplicate policies only

-- Step 1: Drop dangerous public policies (qual:true)
DROP POLICY IF EXISTS "System can manage function logs" ON edge_function_logs;
DROP POLICY IF EXISTS "System can manage idempotency keys" ON idempotency_keys;
DROP POLICY IF EXISTS "System can manage confidence cache" ON metric_confidence_cache;

-- Step 2: Drop duplicate policies on metric_confidence_cache
DROP POLICY IF EXISTS "Users can read own cache" ON metric_confidence_cache;
DROP POLICY IF EXISTS "users_view_own_confidence" ON metric_confidence_cache;
DROP POLICY IF EXISTS "Trainers can read client cache" ON metric_confidence_cache;
DROP POLICY IF EXISTS "trainers_view_client_confidence" ON metric_confidence_cache;

-- Step 3: Clean up api_rate_limits policies
DROP POLICY IF EXISTS "users_view_own_api_limits" ON api_rate_limits;
DROP POLICY IF EXISTS "System can insert rate limits" ON api_rate_limits;

-- Step 4: Fix function missing SET search_path
CREATE OR REPLACE FUNCTION public.update_ai_suggestions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;