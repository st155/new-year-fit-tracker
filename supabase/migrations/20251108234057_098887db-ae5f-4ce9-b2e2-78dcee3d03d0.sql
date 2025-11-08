-- Fix get_client_detailed_data RPC function to use correct columns and tables
CREATE OR REPLACE FUNCTION public.get_client_detailed_data(
  p_client_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'goals', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', g.id,
          'goal_name', g.goal_name,
          'goal_type', g.goal_type,
          'target_value', g.target_value,
          'target_unit', g.target_unit,
          'created_at', g.created_at
        )
      ), '[]'::jsonb)
      FROM goals g
      WHERE g.user_id = p_client_id
    ),
    'measurements', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'goal_id', m.goal_id,
          'value', m.value,
          'unit', m.unit,
          'measurement_date', m.measurement_date,
          'notes', m.notes
        )
      ), '[]'::jsonb)
      FROM measurements m
      WHERE m.user_id = p_client_id
        AND m.measurement_date >= NOW() - (p_days || ' days')::INTERVAL
    ),
    'health_summary', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'date', dhs.date,
          'steps', dhs.steps,
          'active_calories', dhs.active_calories,
          'distance_km', dhs.distance_km,
          'heart_rate_avg', dhs.heart_rate_avg,
          'sleep_hours', dhs.sleep_hours,
          'weight', dhs.weight,
          'vo2_max', dhs.vo2_max
        )
      ), '[]'::jsonb)
      FROM daily_health_summary dhs
      WHERE dhs.user_id = p_client_id
        AND dhs.date >= NOW() - (p_days || ' days')::INTERVAL
    ),
    'unified_metrics', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'user_id', um.user_id,
          'metric_name', um.metric_name,
          'value', um.value,
          'measurement_date', um.measurement_date,
          'source', um.source,
          'unit', um.unit,
          'priority', um.priority,
          'confidence_score', um.confidence_score
        )
      ), '[]'::jsonb)
      FROM unified_metrics um
      WHERE um.user_id = p_client_id
        AND um.measurement_date >= NOW() - (p_days || ' days')::INTERVAL
      ORDER BY um.measurement_date DESC, um.priority ASC
    ),
    'workouts', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', w.id,
          'workout_type', w.workout_type,
          'start_time', w.start_time,
          'end_time', w.end_time,
          'duration_minutes', w.duration_minutes,
          'distance_km', w.distance_km,
          'calories_burned', w.calories_burned,
          'average_heart_rate', w.average_heart_rate,
          'max_heart_rate', w.max_heart_rate,
          'source', w.source,
          'source_workout_id', w.source_workout_id,
          'sport_type', w.sport_type,
          'notes', w.notes
        )
      ), '[]'::jsonb)
      FROM workouts w
      WHERE w.user_id = p_client_id
        AND w.start_time >= NOW() - (p_days || ' days')::INTERVAL
      ORDER BY w.start_time DESC
    )
  );
END;
$$;