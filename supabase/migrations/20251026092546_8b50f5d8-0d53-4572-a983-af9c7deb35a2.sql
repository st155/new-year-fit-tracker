-- =====================================================
-- Phase 7: Production Optimizations - Database Layer
-- =====================================================

-- 1. Performance: Materialized View for Latest Metrics
-- =====================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS latest_unified_metrics AS
SELECT DISTINCT ON (user_id, metric_name)
  user_id,
  metric_name,
  value,
  measurement_date,
  source,
  unit,
  priority,
  created_at
FROM client_unified_metrics
ORDER BY user_id, metric_name, measurement_date DESC, priority ASC;

-- Create index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_latest_unified_metrics_lookup 
ON latest_unified_metrics(user_id, metric_name);

-- 2. Error Handling: Dead Letter Queue
-- =====================================================
CREATE TABLE IF NOT EXISTS public.background_jobs_dlq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_job_id UUID REFERENCES public.background_jobs(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  error TEXT,
  attempts INTEGER DEFAULT 0,
  failed_at TIMESTAMPTZ DEFAULT NOW(),
  retried BOOLEAN DEFAULT FALSE,
  retry_scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.background_jobs_dlq ENABLE ROW LEVEL SECURITY;

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_dlq_retried ON public.background_jobs_dlq(retried, failed_at);
CREATE INDEX IF NOT EXISTS idx_dlq_type ON public.background_jobs_dlq(type);

-- Trigger to move failed jobs to DLQ
CREATE OR REPLACE FUNCTION public.move_to_dlq()
RETURNS TRIGGER AS $$
BEGIN
  -- Only move if max attempts reached and not already in DLQ
  IF NEW.status = 'failed' 
     AND NEW.attempts >= NEW.max_attempts 
     AND NOT EXISTS (
       SELECT 1 FROM public.background_jobs_dlq 
       WHERE original_job_id = NEW.id
     ) THEN
    INSERT INTO public.background_jobs_dlq (
      original_job_id, 
      type, 
      payload, 
      error,
      attempts
    ) VALUES (
      NEW.id, 
      NEW.type, 
      NEW.payload, 
      NEW.error,
      NEW.attempts
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_max_retries_exceeded ON public.background_jobs;
CREATE TRIGGER on_max_retries_exceeded
AFTER UPDATE ON public.background_jobs
FOR EACH ROW
EXECUTE FUNCTION public.move_to_dlq();

-- 3. Security: RLS Policies for Monitoring
-- =====================================================

-- Admin/Trainer access to edge_function_logs
DROP POLICY IF EXISTS "admin_trainer_logs_access" ON public.edge_function_logs;
CREATE POLICY "admin_trainer_logs_access"
ON public.edge_function_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'trainer')
  )
);

-- Admin/Trainer access to background_jobs
DROP POLICY IF EXISTS "admin_trainer_jobs_access" ON public.background_jobs;
CREATE POLICY "admin_trainer_jobs_access"
ON public.background_jobs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'trainer')
  )
);

-- Admin/Trainer access to DLQ
DROP POLICY IF EXISTS "admin_trainer_dlq_access" ON public.background_jobs_dlq;
CREATE POLICY "admin_trainer_dlq_access"
ON public.background_jobs_dlq
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'trainer')
  )
);

-- 4. Rate Limiting: Database Function
-- =====================================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (public access for rate limiting)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rate_limits_public" ON public.rate_limits;
CREATE POLICY "rate_limits_public"
ON public.rate_limits
FOR ALL
USING (true)
WITH CHECK (true);

-- Auto-cleanup old rate limit entries
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits(window_start);

-- Function to check and increment rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_max_requests INTEGER,
  p_window_seconds INTEGER DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  -- Clean up expired entries first
  DELETE FROM public.rate_limits
  WHERE window_start < NOW() - (p_window_seconds || ' seconds')::INTERVAL;
  
  -- Get current count for this key
  SELECT count, window_start INTO v_count, v_window_start
  FROM public.rate_limits
  WHERE key = p_key;
  
  -- If no entry exists, create one
  IF v_count IS NULL THEN
    INSERT INTO public.rate_limits (key, count, window_start)
    VALUES (p_key, 1, NOW());
    RETURN TRUE;
  END IF;
  
  -- Check if window expired
  IF v_window_start < NOW() - (p_window_seconds || ' seconds')::INTERVAL THEN
    UPDATE public.rate_limits
    SET count = 1, window_start = NOW()
    WHERE key = p_key;
    RETURN TRUE;
  END IF;
  
  -- Check if under limit
  IF v_count < p_max_requests THEN
    UPDATE public.rate_limits
    SET count = count + 1
    WHERE key = p_key;
    RETURN TRUE;
  END IF;
  
  -- Rate limit exceeded
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Cleanup function for rate limits
-- =====================================================
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;