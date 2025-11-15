-- Phase 2 Final: Remove remaining public access policies

-- Fix rate_limits - drop public policy
DROP POLICY IF EXISTS "rate_limits_public" ON rate_limits;

-- Fix unified_metrics - drop dangerous public policy
DROP POLICY IF EXISTS "System can manage metrics" ON unified_metrics;

-- Clean up duplicate policies on unified_metrics (keep only the clear ones)
DROP POLICY IF EXISTS "Users can read own metrics" ON unified_metrics;
DROP POLICY IF EXISTS "users_view_own_unified_metrics" ON unified_metrics;
DROP POLICY IF EXISTS "Trainers can read client metrics" ON unified_metrics;
DROP POLICY IF EXISTS "trainers_view_client_unified_metrics" ON unified_metrics;
DROP POLICY IF EXISTS "system_manage_unified_metrics" ON unified_metrics;

-- Ensure write policies exist for unified_metrics (already created in previous migration)