-- ============================================================================
-- Security Fixes Migration
-- Fixes: Security Definer Views and Function Search Path issues
-- ============================================================================

-- ============================================================================
-- PART 1: Fix Security Definer Views
-- ============================================================================

-- Drop and recreate monitoring views WITHOUT security definer
DROP VIEW IF EXISTS edge_function_performance CASCADE;
DROP VIEW IF EXISTS job_processing_stats CASCADE;
DROP VIEW IF EXISTS data_quality_trends CASCADE;
DROP VIEW IF EXISTS webhook_processing_stats CASCADE;

-- Recreate WITHOUT security definer
CREATE VIEW edge_function_performance AS
SELECT
  function_name,
  DATE(timestamp) as date,
  COUNT(*) as invocation_count,
  COUNT(*) FILTER (WHERE level = 'error') as error_count,
  AVG(duration_ms) as avg_duration_ms,
  MAX(duration_ms) as max_duration_ms
FROM edge_function_logs
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY function_name, DATE(timestamp);

CREATE VIEW job_processing_stats AS
SELECT
  type as job_type,
  DATE(completed_at) as date,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds
FROM background_jobs
WHERE completed_at >= NOW() - INTERVAL '7 days'
GROUP BY type, DATE(completed_at);

CREATE VIEW data_quality_trends AS
SELECT
  um.metric_name,
  DATE(um.measurement_date) as date,
  AVG(mcc.confidence_score) as avg_confidence,
  COUNT(DISTINCT um.user_id) as user_count
FROM unified_metrics um
LEFT JOIN metric_confidence_cache mcc 
  ON mcc.user_id = um.user_id 
  AND mcc.metric_name = um.metric_name
WHERE um.measurement_date >= NOW() - INTERVAL '30 days'
GROUP BY um.metric_name, DATE(um.measurement_date);

CREATE VIEW webhook_processing_stats AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_webhooks,
  COUNT(*) FILTER (WHERE status = 'processed') as processed_count,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_count
FROM terra_webhooks_raw
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at);

-- ============================================================================
-- PART 2: Fix Function Search Path
-- ============================================================================

CREATE OR REPLACE FUNCTION public.normalize_biomarker_name(name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
BEGIN
  RETURN LOWER(REGEXP_REPLACE(TRIM(name), '[^a-z0-9]', '', 'g'));
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_streak_days(p_user_id uuid, p_end_date date DEFAULT CURRENT_DATE)
RETURNS integer
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $function$
DECLARE
  v_streak INTEGER := 0;
  v_current_date DATE := p_end_date;
  v_has_data BOOLEAN;
BEGIN
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM public.unified_metrics
      WHERE user_id = p_user_id 
      AND measurement_date = v_current_date
    ) INTO v_has_data;
    
    EXIT WHEN NOT v_has_data;
    v_streak := v_streak + 1;
    v_current_date := v_current_date - INTERVAL '1 day';
  END LOOP;
  
  RETURN v_streak;
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_view_profile(_viewer uuid, _target uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT 
    _viewer = _target
    OR EXISTS (
      SELECT 1 FROM public.challenge_participants cp1
      INNER JOIN public.challenge_participants cp2 ON cp1.challenge_id = cp2.challenge_id
      WHERE cp1.user_id = _viewer AND cp2.user_id = _target
    )
    OR EXISTS (
      SELECT 1 FROM public.challenge_trainers ct
      INNER JOIN public.challenge_participants cp ON ct.challenge_id = cp.challenge_id
      WHERE ct.trainer_id = _viewer AND cp.user_id = _target
    )
    OR EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.trainer_id = _viewer AND tc.client_id = _target AND tc.active = true
    )
$function$;

-- Add search_path to other security definer functions
CREATE OR REPLACE FUNCTION public.sync_metric_values_to_unified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_metric_name TEXT;
  v_metric_category TEXT;
  v_unit TEXT;
  v_source TEXT;
  v_priority INTEGER;
BEGIN
  SELECT metric_name, metric_category, unit, source
  INTO v_metric_name, v_metric_category, v_unit, v_source
  FROM public.user_metrics
  WHERE id = NEW.metric_id;

  IF v_metric_name IS NULL THEN RETURN NEW; END IF;

  v_priority := CASE LOWER(v_source)
    WHEN 'whoop' THEN 1
    WHEN 'garmin' THEN 2
    WHEN 'ultrahuman' THEN 2
    WHEN 'oura' THEN 3
    WHEN 'withings' THEN 4
    ELSE 5
  END;

  IF v_metric_name = 'Steps' THEN
    INSERT INTO public.unified_metrics (
      user_id, metric_name, metric_category, source, provider,
      value, unit, measurement_date, priority, confidence_score
    ) VALUES (
      NEW.user_id, v_metric_name, v_metric_category, 
      LOWER(v_source), LOWER(v_source),
      NEW.value, v_unit, NEW.measurement_date, v_priority, 50
    )
    ON CONFLICT (user_id, metric_name, measurement_date, source)
    DO UPDATE SET value = GREATEST(public.unified_metrics.value, EXCLUDED.value), updated_at = NOW();
  ELSE
    INSERT INTO public.unified_metrics (
      user_id, metric_name, metric_category, source, provider,
      value, unit, measurement_date, priority, confidence_score
    ) VALUES (
      NEW.user_id, v_metric_name, v_metric_category, 
      LOWER(v_source), LOWER(v_source),
      NEW.value, v_unit, NEW.measurement_date, v_priority, 50
    )
    ON CONFLICT (user_id, metric_name, measurement_date, source)
    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$function$;

-- Add comments for monitoring views
COMMENT ON VIEW edge_function_performance IS 'Admin-only monitoring view';
COMMENT ON VIEW job_processing_stats IS 'Admin-only monitoring view';
COMMENT ON VIEW data_quality_trends IS 'Admin-only monitoring view';
COMMENT ON VIEW webhook_processing_stats IS 'Admin-only monitoring view';