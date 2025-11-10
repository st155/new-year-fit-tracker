-- Fix search_path security warning for get_aggregated_workouts function
DROP FUNCTION IF EXISTS get_aggregated_workouts(uuid);

CREATE OR REPLACE FUNCTION get_aggregated_workouts(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  workout_name text,
  assigned_plan_id uuid,
  day_of_week integer,
  performed_at timestamptz,
  duration_minutes integer,
  total_volume numeric,
  total_sets bigint,
  total_exercises bigint,
  estimated_calories integer,
  source text
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gen_random_uuid() as id,
    wl.user_id,
    wl.workout_name,
    wl.assigned_plan_id,
    wl.day_of_week,
    MAX(wl.performed_at) as performed_at,
    EXTRACT(EPOCH FROM (MAX(wl.performed_at) - MIN(wl.performed_at)))::integer / 60 as duration_minutes,
    SUM(wl.actual_weight * wl.actual_reps) as total_volume,
    COUNT(*)::bigint as total_sets,
    COUNT(DISTINCT wl.exercise_name)::bigint as total_exercises,
    ROUND(SUM(wl.actual_weight * wl.actual_reps) * 0.005)::integer as estimated_calories,
    'manual'::text as source
  FROM workout_logs wl
  WHERE wl.user_id = p_user_id
  GROUP BY wl.user_id, wl.workout_name, wl.assigned_plan_id, wl.day_of_week, DATE(wl.performed_at)
  ORDER BY performed_at DESC;
END;
$$ LANGUAGE plpgsql;