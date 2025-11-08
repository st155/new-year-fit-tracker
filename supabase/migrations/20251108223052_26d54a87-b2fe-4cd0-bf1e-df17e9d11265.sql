-- Update get_client_goals_with_progress to read from goal_current_values
DROP FUNCTION IF EXISTS get_client_goals_with_progress(UUID);

CREATE OR REPLACE FUNCTION get_client_goals_with_progress(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  goal_name TEXT,
  goal_type TEXT,
  target_value NUMERIC,
  target_unit TEXT,
  current_value NUMERIC,
  progress_percentage NUMERIC,
  last_measurement_date DATE,
  measurements_count BIGINT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    g.user_id,
    g.goal_name,
    g.goal_type,
    g.target_value,
    g.target_unit,
    -- Read from goal_current_values instead of measurements
    COALESCE(gcv.current_value, 0) as current_value,
    CASE 
      WHEN g.target_value > 0 THEN 
        ROUND((COALESCE(gcv.current_value, 0) / g.target_value * 100)::NUMERIC, 1)
      ELSE 0 
    END as progress_percentage,
    gcv.last_updated::DATE as last_measurement_date,
    (SELECT COUNT(*) FROM measurements m WHERE m.goal_id = g.id) as measurements_count,
    g.created_at,
    g.updated_at
  FROM goals g
  LEFT JOIN goal_current_values gcv ON g.id = gcv.goal_id AND g.user_id = gcv.user_id
  WHERE g.user_id = p_user_id
  ORDER BY g.created_at DESC;
END;
$$;