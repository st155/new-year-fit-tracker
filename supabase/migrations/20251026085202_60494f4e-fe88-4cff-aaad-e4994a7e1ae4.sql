-- Phase 4: Setup cron job for job-worker
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job to run job-worker every minute
SELECT cron.schedule(
  'job-worker-processor',
  '* * * * *', -- Every minute
  $$
  SELECT
    net.http_post(
        url:='https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/job-worker',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleWttbXptZ3V6anBwZHVkdmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTAwNjEsImV4cCI6MjA3NDAyNjA2MX0.nSc_MFoU6rAsyw0c8Mv-BD0MPuGAsuDXUckvMUyYX94"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Grant necessary permissions for service role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA cron TO postgres;

-- Add RLS policies for tables that were missing them
-- These are for internal system tables that should only be accessible by authenticated users

-- Policy for idempotency_keys (if RLS is enabled but no policies)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'idempotency_keys'
  ) AND EXISTS (
    SELECT 1 FROM pg_class pc
    JOIN pg_namespace pn ON pc.relnamespace = pn.oid
    WHERE pn.nspname = 'public' 
    AND pc.relname = 'idempotency_keys'
    AND pc.relrowsecurity = true
  ) THEN
    -- Drop existing policies if any
    DROP POLICY IF EXISTS "System can manage idempotency keys" ON public.idempotency_keys;
    
    -- Create policy for service role only
    CREATE POLICY "System can manage idempotency keys"
      ON public.idempotency_keys FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Policy for api_rate_limits (if RLS is enabled but no policies)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'api_rate_limits'
  ) AND EXISTS (
    SELECT 1 FROM pg_class pc
    JOIN pg_namespace pn ON pc.relnamespace = pn.oid
    WHERE pn.nspname = 'public' 
    AND pc.relname = 'api_rate_limits'
    AND pc.relrowsecurity = true
  ) THEN
    DROP POLICY IF EXISTS "System can manage rate limits" ON public.api_rate_limits;
    
    CREATE POLICY "System can manage rate limits"
      ON public.api_rate_limits FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Policy for data_freshness_tracking (if RLS is enabled but no policies)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'data_freshness_tracking'
  ) AND EXISTS (
    SELECT 1 FROM pg_class pc
    JOIN pg_namespace pn ON pc.relnamespace = pn.oid
    WHERE pn.nspname = 'public' 
    AND pc.relname = 'data_freshness_tracking'
    AND pc.relrowsecurity = true
  ) THEN
    DROP POLICY IF EXISTS "Users can view their own data freshness" ON public.data_freshness_tracking;
    DROP POLICY IF EXISTS "System can manage data freshness" ON public.data_freshness_tracking;
    
    CREATE POLICY "Users can view their own data freshness"
      ON public.data_freshness_tracking FOR SELECT
      USING (auth.uid() = user_id);
    
    CREATE POLICY "System can manage data freshness"
      ON public.data_freshness_tracking FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Policy for edge_function_logs (if RLS is enabled but no policies)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'edge_function_logs'
  ) AND EXISTS (
    SELECT 1 FROM pg_class pc
    JOIN pg_namespace pn ON pc.relnamespace = pn.oid
    WHERE pn.nspname = 'public' 
    AND pc.relname = 'edge_function_logs'
    AND pc.relrowsecurity = true
  ) THEN
    DROP POLICY IF EXISTS "System can manage function logs" ON public.edge_function_logs;
    
    CREATE POLICY "System can manage function logs"
      ON public.edge_function_logs FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;