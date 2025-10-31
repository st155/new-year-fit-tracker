-- Fix get_client_detailed_data to use unified_metrics table instead of old metric_values
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
    -- ✅ FIXED: using unified_metrics table directly
    SELECT jsonb_agg(
      jsonb_build_object(
        'metric_name', um.metric_name,
        'value', um.value,
        'measurement_date', um.measurement_date,
        'source', um.source,
        'unit', um.unit,
        'category', um.metric_category
      ) ORDER BY um.measurement_date DESC
    ) as unified_metrics
    FROM unified_metrics um
    WHERE um.user_id = p_client_id
      AND um.measurement_date >= v_start_date
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

-- Ensure permissions
GRANT EXECUTE ON FUNCTION get_client_detailed_data(UUID, INTEGER) TO authenticated;