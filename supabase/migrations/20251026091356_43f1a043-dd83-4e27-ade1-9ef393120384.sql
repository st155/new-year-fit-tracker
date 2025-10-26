-- Phase 6: Monitoring & Testing Infrastructure (Fixed v2)

-- Step 1: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_background_jobs_status_created ON background_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_background_jobs_type_status ON background_jobs(type, status);
CREATE INDEX IF NOT EXISTS idx_metric_confidence_cache_user_metric ON metric_confidence_cache(user_id, metric_name);
CREATE INDEX IF NOT EXISTS idx_metric_confidence_cache_updated ON metric_confidence_cache(updated_at DESC);

-- Step 2: Create monitoring views
CREATE OR REPLACE VIEW edge_function_performance AS
SELECT 
  function_name,
  DATE(timestamp) as date,
  COUNT(*) as invocations,
  COUNT(CASE WHEN level = 'error' THEN 1 END) as errors,
  MIN(timestamp) as first_invocation,
  MAX(timestamp) as last_invocation
FROM edge_function_logs
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY function_name, DATE(timestamp)
ORDER BY date DESC, invocations DESC;

CREATE OR REPLACE VIEW job_processing_stats AS
SELECT 
  DATE(created_at) as date,
  type as job_type,
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_duration_seconds,
  MAX(EXTRACT(EPOCH FROM (completed_at - created_at))) as max_duration_seconds
FROM background_jobs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), type, status
ORDER BY date DESC;

CREATE OR REPLACE VIEW data_quality_trends AS
SELECT 
  DATE(updated_at) as date,
  metric_name,
  AVG(confidence_score) as avg_confidence,
  COUNT(*) as metrics_count,
  COUNT(CASE WHEN confidence_score >= 80 THEN 1 END) as excellent_count,
  COUNT(CASE WHEN confidence_score >= 60 AND confidence_score < 80 THEN 1 END) as good_count,
  COUNT(CASE WHEN confidence_score >= 40 AND confidence_score < 60 THEN 1 END) as fair_count,
  COUNT(CASE WHEN confidence_score < 40 THEN 1 END) as poor_count
FROM metric_confidence_cache
WHERE updated_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(updated_at), metric_name
ORDER BY date DESC;

CREATE OR REPLACE VIEW webhook_processing_stats AS
SELECT 
  DATE(created_at) as date,
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_processing_seconds
FROM terra_webhooks_raw
WHERE created_at > NOW() - INTERVAL '7 days'
  AND processed_at IS NOT NULL
GROUP BY DATE(created_at), status
ORDER BY date DESC;

-- Step 3: Create function to notify on failed jobs
CREATE OR REPLACE FUNCTION notify_failed_job()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'failed' AND (OLD.status IS NULL OR OLD.status != 'failed') THEN
    INSERT INTO edge_function_logs (
      function_name, 
      level,
      message,
      metadata,
      timestamp
    ) VALUES (
      'job-worker-alert',
      'error',
      'Job failed: ' || NEW.type,
      jsonb_build_object(
        'job_id', NEW.id,
        'attempts', NEW.attempts,
        'error', NEW.error,
        'payload', NEW.payload
      ),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_job_failure ON background_jobs;
CREATE TRIGGER on_job_failure
AFTER UPDATE ON background_jobs
FOR EACH ROW
EXECUTE FUNCTION notify_failed_job();

-- Step 4: Create function to enqueue initial confidence calculations
CREATE OR REPLACE FUNCTION enqueue_initial_confidence_calculations()
RETURNS TABLE(jobs_created INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jobs_created INTEGER := 0;
BEGIN
  INSERT INTO background_jobs (type, payload, status)
  SELECT 
    'confidence_calculation'::text,
    jsonb_build_object(
      'user_id', um.user_id::text,
      'metric_name', um.metric_name,
      'measurement_date', MAX(mv.measurement_date)::text
    ),
    'pending'::text
  FROM user_metrics um
  JOIN metric_values mv ON mv.metric_id = um.id
  WHERE NOT EXISTS (
    SELECT 1 FROM metric_confidence_cache mcc
    WHERE mcc.user_id = um.user_id 
    AND mcc.metric_name = um.metric_name
  )
  GROUP BY um.user_id, um.metric_name
  ON CONFLICT DO NOTHING;
  
  GET DIAGNOSTICS v_jobs_created = ROW_COUNT;
  
  RETURN QUERY SELECT v_jobs_created;
END;
$$;

-- Step 5: Create function to get monitoring dashboard data
CREATE OR REPLACE FUNCTION get_monitoring_dashboard_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH job_stats AS (
    SELECT 
      status,
      COUNT(*) as count
    FROM background_jobs
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY status
  ),
  confidence_stats AS (
    SELECT 
      COUNT(*) as total_metrics,
      AVG(confidence_score) as avg_confidence,
      COUNT(CASE WHEN confidence_score >= 80 THEN 1 END) as excellent,
      COUNT(CASE WHEN confidence_score >= 60 AND confidence_score < 80 THEN 1 END) as good,
      COUNT(CASE WHEN confidence_score >= 40 AND confidence_score < 60 THEN 1 END) as fair,
      COUNT(CASE WHEN confidence_score < 40 THEN 1 END) as poor
    FROM metric_confidence_cache
  ),
  webhook_stats AS (
    SELECT 
      COUNT(*) as total_webhooks,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
    FROM terra_webhooks_raw
    WHERE created_at > NOW() - INTERVAL '24 hours'
  )
  SELECT jsonb_build_object(
    'jobs', (SELECT jsonb_object_agg(status, count) FROM job_stats),
    'confidence', (SELECT row_to_json(confidence_stats.*) FROM confidence_stats),
    'webhooks', (SELECT row_to_json(webhook_stats.*) FROM webhook_stats),
    'timestamp', NOW()
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Step 6: Create function to retry failed jobs
CREATE OR REPLACE FUNCTION retry_failed_jobs(p_job_type text DEFAULT NULL)
RETURNS TABLE(retried_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_retried INTEGER := 0;
BEGIN
  UPDATE background_jobs
  SET 
    status = 'pending',
    attempts = 0,
    error = NULL,
    started_at = NULL
  WHERE status = 'failed'
    AND (p_job_type IS NULL OR type = p_job_type)
    AND attempts < max_attempts;
  
  GET DIAGNOSTICS v_retried = ROW_COUNT;
  
  RETURN QUERY SELECT v_retried;
END;
$$;