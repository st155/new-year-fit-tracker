-- Update get_client_detailed_data to include workouts
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
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'goals', COALESCE((
      SELECT json_agg(
        json_build_object(
          'id', g.id,
          'goal_name', g.goal_name,
          'target_value', g.target_value,
          'target_unit', g.target_unit,
          'goal_type', g.goal_type,
          'created_at', g.created_at
        )
      )
      FROM goals g
      WHERE g.user_id = p_client_id
    ), '[]'::json),
    
    'measurements', COALESCE((
      SELECT json_agg(
        json_build_object(
          'id', m.id,
          'goal_id', m.goal_id,
          'value', m.value,
          'measurement_date', m.measurement_date,
          'goal_name', g.goal_name,
          'unit', g.target_unit,
          'source', m.source
        ) ORDER BY m.measurement_date DESC
      )
      FROM goal_measurements m
      LEFT JOIN goals g ON g.id = m.goal_id
      WHERE m.user_id = p_client_id
        AND m.measurement_date >= NOW() - (p_days || ' days')::INTERVAL
    ), '[]'::json),
    
    'unified_metrics', COALESCE((
      SELECT json_agg(
        json_build_object(
          'metric_name', um.metric_name,
          'value', um.value,
          'measurement_date', um.measurement_date,
          'source', um.source,
          'unit', um.unit
        ) ORDER BY um.measurement_date DESC
      )
      FROM unified_metrics um
      WHERE um.user_id = p_client_id
        AND um.measurement_date >= NOW() - (p_days || ' days')::INTERVAL
    ), '[]'::json),
    
    'workouts', COALESCE((
      SELECT json_agg(
        json_build_object(
          'id', w.id,
          'workout_type', w.workout_type,
          'start_time', w.start_time,
          'end_time', w.end_time,
          'duration_minutes', w.duration_minutes,
          'calories_burned', w.calories_burned,
          'distance_km', w.distance_km,
          'heart_rate_avg', w.heart_rate_avg,
          'heart_rate_max', w.heart_rate_max,
          'source', w.source,
          'measurement_date', DATE(w.start_time AT TIME ZONE 'UTC')
        ) ORDER BY w.start_time DESC
      )
      FROM workouts w
      WHERE w.user_id = p_client_id
        AND w.start_time >= NOW() - (p_days || ' days')::INTERVAL
    ), '[]'::json),
    
    'health_summary', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', dhs.measurement_date,
          'steps', dhs.steps,
          'weight', dhs.weight,
          'heart_rate_avg', dhs.heart_rate_avg,
          'active_calories', dhs.active_calories,
          'sleep_hours', dhs.sleep_hours
        ) ORDER BY dhs.measurement_date DESC
      )
      FROM daily_health_summary dhs
      WHERE dhs.user_id = p_client_id
        AND dhs.measurement_date >= NOW() - (p_days || ' days')::INTERVAL
    ), '[]'::jsonb),
    
    'ai_history', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', aal.id,
          'action_type', aal.action_type,
          'action_details', aal.action_details,
          'success', aal.success,
          'created_at', aal.created_at
        ) ORDER BY aal.created_at DESC
      )
      FROM ai_action_logs aal
      WHERE aal.client_id = p_client_id
      ORDER BY aal.created_at DESC
      LIMIT 50
    ), '[]'::jsonb)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Ensure permissions
GRANT EXECUTE ON FUNCTION get_client_detailed_data(UUID, INTEGER) TO authenticated;