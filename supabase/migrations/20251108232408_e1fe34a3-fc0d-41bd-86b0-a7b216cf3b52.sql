-- Fix get_client_detailed_data function - correct column name in daily_health_summary
CREATE OR REPLACE FUNCTION public.get_client_detailed_data(
  p_client_id uuid,
  p_days integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'goals', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', g.id,
          'goal_name', g.goal_name,
          'goal_type', g.goal_type,
          'target_value', g.target_value,
          'target_unit', g.target_unit,
          'current_value', COALESCE(gcv.current_value, 0),
          'progress_percentage', CASE 
            WHEN g.target_value > 0 THEN ROUND((COALESCE(gcv.current_value, 0) / g.target_value * 100)::numeric, 1)
            ELSE 0 
          END,
          'is_personal', g.is_personal,
          'challenge_id', g.challenge_id,
          'created_at', g.created_at
        )
      ), '[]'::jsonb)
      FROM goals g
      LEFT JOIN goal_current_values gcv ON g.id = gcv.goal_id
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
          'calories_burned', dhs.calories_burned,
          'distance', dhs.distance,
          'heart_rate_avg', dhs.heart_rate_avg,
          'sleep_hours', dhs.sleep_hours,
          'water_intake', dhs.water_intake
        )
      ), '[]'::jsonb)
      FROM daily_health_summary dhs
      WHERE dhs.user_id = p_client_id
        AND dhs.date >= NOW() - (p_days || ' days')::INTERVAL
    ),
    'whoop_data', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'date', wd.date,
          'recovery_score', wd.recovery_score,
          'hrv', wd.hrv,
          'resting_heart_rate', wd.resting_heart_rate,
          'day_strain', wd.day_strain,
          'calories', wd.calories,
          'sleep_performance', wd.sleep_performance
        )
      ), '[]'::jsonb)
      FROM whoop_data wd
      WHERE wd.user_id = p_client_id
        AND wd.date >= NOW() - (p_days || ' days')::INTERVAL
    ),
    'oura_data', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'date', od.date,
          'readiness_score', od.readiness_score,
          'sleep_score', od.sleep_score,
          'activity_score', od.activity_score,
          'total_sleep', od.total_sleep,
          'deep_sleep', od.deep_sleep,
          'rem_sleep', od.rem_sleep
        )
      ), '[]'::jsonb)
      FROM oura_data od
      WHERE od.user_id = p_client_id
        AND od.date >= NOW() - (p_days || ' days')::INTERVAL
    )
  ) INTO v_result;

  RETURN v_result;
END;
$function$;