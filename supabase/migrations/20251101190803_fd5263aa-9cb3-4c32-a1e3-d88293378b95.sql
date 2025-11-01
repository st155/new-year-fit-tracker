-- ============================================================================
-- FIX LAST FUNCTION SEARCH PATH WARNING
-- ============================================================================

-- Fix get_challenge_participant_goals_with_progress function
CREATE OR REPLACE FUNCTION get_challenge_participant_goals_with_progress(
  p_challenge_id UUID,
  p_user_id UUID
)
RETURNS TABLE(
  goal_id UUID,
  goal_name TEXT,
  goal_type TEXT,
  target_value NUMERIC,
  target_unit TEXT,
  current_value NUMERIC,
  progress_percentage NUMERIC,
  last_measurement_date DATE,
  measurements_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id as goal_id,
    g.goal_name,
    g.goal_type,
    g.target_value,
    g.target_unit,
    COALESCE((
      SELECT m.value
      FROM measurements m
      WHERE m.goal_id = g.id
        AND m.user_id = p_user_id
      ORDER BY m.measurement_date DESC
      LIMIT 1
    ), 0) as current_value,
    CASE 
      WHEN g.target_value > 0 THEN
        LEAST(100, COALESCE((
          SELECT (m.value / g.target_value * 100)
          FROM measurements m
          WHERE m.goal_id = g.id
            AND m.user_id = p_user_id
          ORDER BY m.measurement_date DESC
          LIMIT 1
        ), 0))
      ELSE 0
    END as progress_percentage,
    (
      SELECT m.measurement_date
      FROM measurements m
      WHERE m.goal_id = g.id
        AND m.user_id = p_user_id
      ORDER BY m.measurement_date DESC
      LIMIT 1
    ) as last_measurement_date,
    COALESCE((
      SELECT COUNT(*)
      FROM measurements m
      WHERE m.goal_id = g.id
        AND m.user_id = p_user_id
    ), 0) as measurements_count
  FROM goals g
  WHERE g.user_id = p_user_id
  ORDER BY g.created_at DESC;
END;
$$;