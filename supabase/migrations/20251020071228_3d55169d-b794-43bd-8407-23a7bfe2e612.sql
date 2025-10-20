-- Phase 1: Optimize client data loading

-- Create materialized view for trainer client summary
CREATE MATERIALIZED VIEW IF NOT EXISTS public.trainer_client_summary AS
SELECT 
  tc.trainer_id,
  tc.client_id,
  p.username,
  p.full_name,
  p.avatar_url,
  COUNT(DISTINCT g.id) FILTER (WHERE g.is_personal = true) as active_goals_count,
  COUNT(DISTINCT m.id) FILTER (WHERE m.measurement_date >= CURRENT_DATE - INTERVAL '7 days') as recent_measurements_count,
  MAX(m.measurement_date) as last_activity_date,
  jsonb_build_object(
    'whoop_recovery_avg', (
      SELECT AVG(mv.value)::numeric(10,2)
      FROM metric_values mv
      JOIN user_metrics um ON um.id = mv.metric_id
      WHERE um.user_id = tc.client_id 
        AND um.metric_name = 'Recovery Score' 
        AND um.source = 'whoop'
        AND mv.measurement_date >= CURRENT_DATE - INTERVAL '7 days'
    ),
    'sleep_hours_avg', (
      SELECT AVG(mv.value)::numeric(10,2)
      FROM metric_values mv
      JOIN user_metrics um ON um.id = mv.metric_id
      WHERE um.user_id = tc.client_id 
        AND um.metric_name = 'Sleep Duration'
        AND mv.measurement_date >= CURRENT_DATE - INTERVAL '7 days'
    ),
    'weight_latest', (
      SELECT mv.value
      FROM metric_values mv
      JOIN user_metrics um ON um.id = mv.metric_id
      WHERE um.user_id = tc.client_id 
        AND um.metric_name = 'Weight'
      ORDER BY mv.measurement_date DESC 
      LIMIT 1
    ),
    'vo2max_latest', (
      SELECT mv.value
      FROM metric_values mv
      JOIN user_metrics um ON um.id = mv.metric_id
      WHERE um.user_id = tc.client_id 
        AND um.metric_name IN ('VO2 Max', 'VO2Max')
      ORDER BY mv.measurement_date DESC 
      LIMIT 1
    )
  ) as health_summary
FROM trainer_clients tc
JOIN profiles p ON p.user_id = tc.client_id
LEFT JOIN goals g ON g.user_id = tc.client_id
LEFT JOIN measurements m ON m.user_id = tc.client_id
WHERE tc.active = true
GROUP BY tc.trainer_id, tc.client_id, p.username, p.full_name, p.avatar_url;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trainer_client_summary_trainer_id ON trainer_client_summary(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_client_summary_client_id ON trainer_client_summary(client_id);
CREATE INDEX IF NOT EXISTS idx_trainer_client_summary_last_activity ON trainer_client_summary(last_activity_date DESC NULLS LAST);

-- Create function to refresh the view
CREATE OR REPLACE FUNCTION public.refresh_trainer_client_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY trainer_client_summary;
END;
$$;

-- Create RPC function to get detailed client data in one call
CREATE OR REPLACE FUNCTION public.get_client_detailed_data(
  p_client_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date DATE;
  v_result jsonb;
BEGIN
  v_start_date := CURRENT_DATE - (p_days || ' days')::INTERVAL;
  
  WITH client_goals AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', g.id,
        'goal_name', g.goal_name,
        'target_value', g.target_value,
        'target_unit', g.target_unit,
        'goal_type', g.goal_type,
        'current_value', (
          SELECT m.value 
          FROM measurements m 
          WHERE m.goal_id = g.id 
          ORDER BY m.measurement_date DESC 
          LIMIT 1
        )
      ) ORDER BY g.created_at DESC
    ) as goals
    FROM goals g
    WHERE g.user_id = p_client_id
  ),
  client_measurements AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'value', m.value,
        'measurement_date', m.measurement_date,
        'goal_name', g.goal_name,
        'unit', g.target_unit,
        'source', m.source
      ) ORDER BY m.measurement_date DESC
    ) as measurements
    FROM measurements m
    JOIN goals g ON g.id = m.goal_id
    WHERE m.user_id = p_client_id
      AND m.measurement_date >= v_start_date
  ),
  client_unified_metrics AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'metric_name', um.metric_name,
        'value', mv.value,
        'measurement_date', mv.measurement_date,
        'source', um.source,
        'unit', um.unit,
        'category', um.metric_category
      ) ORDER BY mv.measurement_date DESC
    ) as unified_metrics
    FROM metric_values mv
    JOIN user_metrics um ON um.id = mv.metric_id
    WHERE mv.user_id = p_client_id
      AND mv.measurement_date >= v_start_date
  ),
  client_health_summary AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'date', dhs.date,
        'steps', dhs.steps,
        'weight', dhs.weight,
        'heart_rate_avg', dhs.heart_rate_avg,
        'active_calories', dhs.active_calories,
        'sleep_hours', dhs.sleep_hours,
        'vo2_max', dhs.vo2_max
      ) ORDER BY dhs.date DESC
    ) as health_summary
    FROM daily_health_summary dhs
    WHERE dhs.user_id = p_client_id
      AND dhs.date >= v_start_date
  ),
  ai_logs AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', al.id,
        'action_type', al.action_type,
        'action_details', al.action_details,
        'success', al.success,
        'created_at', al.created_at
      ) ORDER BY al.created_at DESC
    ) as ai_history
    FROM ai_action_logs al
    WHERE al.client_id = p_client_id
      AND al.created_at >= v_start_date - INTERVAL '7 days'
  )
  SELECT jsonb_build_object(
    'goals', COALESCE((SELECT goals FROM client_goals), '[]'::jsonb),
    'measurements', COALESCE((SELECT measurements FROM client_measurements), '[]'::jsonb),
    'unified_metrics', COALESCE((SELECT unified_metrics FROM client_unified_metrics), '[]'::jsonb),
    'health_summary', COALESCE((SELECT health_summary FROM client_health_summary), '[]'::jsonb),
    'ai_history', COALESCE((SELECT ai_history FROM ai_logs), '[]'::jsonb)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Grant permissions
GRANT SELECT ON trainer_client_summary TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_trainer_client_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION get_client_detailed_data(UUID, INTEGER) TO authenticated;