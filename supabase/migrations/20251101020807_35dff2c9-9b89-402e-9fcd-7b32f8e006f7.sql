-- ====================================================================
-- RPC Functions for Enhanced Trainer Client Data
-- ====================================================================

-- Function: Get trainer clients with enhanced health metrics and activity
CREATE OR REPLACE FUNCTION get_trainer_clients_enhanced(p_trainer_id UUID)
RETURNS TABLE (
  client_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  active_goals_count BIGINT,
  recent_measurements_count BIGINT,
  last_activity_date DATE,
  health_score INTEGER,
  whoop_recovery_avg NUMERIC,
  sleep_hours_avg NUMERIC,
  weight_latest NUMERIC,
  vo2max_latest NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tc.client_id,
    p.username,
    p.full_name,
    p.avatar_url,
    
    -- Active goals count
    COALESCE((
      SELECT COUNT(*)
      FROM goals g
      WHERE g.user_id = tc.client_id
    ), 0) as active_goals_count,
    
    -- Recent measurements (last 30 days)
    COALESCE((
      SELECT COUNT(*)
      FROM measurements m
      WHERE m.user_id = tc.client_id
        AND m.measurement_date >= CURRENT_DATE - INTERVAL '30 days'
    ), 0) as recent_measurements_count,
    
    -- Last activity date
    (
      SELECT MAX(m.measurement_date)
      FROM measurements m
      WHERE m.user_id = tc.client_id
    ) as last_activity_date,
    
    -- Health score calculation (0-100)
    LEAST(100, 
      COALESCE((SELECT COUNT(*) FROM goals WHERE user_id = tc.client_id), 0) * 5 +
      COALESCE((SELECT COUNT(*) FROM measurements WHERE user_id = tc.client_id AND measurement_date >= CURRENT_DATE - INTERVAL '7 days'), 0) * 10 +
      CASE 
        WHEN (SELECT MAX(measurement_date) FROM measurements WHERE user_id = tc.client_id) >= CURRENT_DATE - INTERVAL '7 days' THEN 30
        WHEN (SELECT MAX(measurement_date) FROM measurements WHERE user_id = tc.client_id) >= CURRENT_DATE - INTERVAL '14 days' THEN 15
        ELSE 0
      END
    )::INTEGER as health_score,
    
    -- Whoop recovery average (last 7 days)
    (
      SELECT AVG(
        CASE 
          WHEN source_data->>'recovery_score' IS NOT NULL 
          THEN (source_data->>'recovery_score')::NUMERIC 
          ELSE NULL 
        END
      )
      FROM daily_health_summary
      WHERE user_id = tc.client_id
        AND date >= CURRENT_DATE - INTERVAL '7 days'
        AND source_data->>'recovery_score' IS NOT NULL
    ) as whoop_recovery_avg,
    
    -- Sleep hours average (last 7 days)
    (
      SELECT AVG(sleep_hours)
      FROM daily_health_summary
      WHERE user_id = tc.client_id
        AND date >= CURRENT_DATE - INTERVAL '7 days'
        AND sleep_hours IS NOT NULL
    ) as sleep_hours_avg,
    
    -- Latest weight
    (
      SELECT weight
      FROM daily_health_summary
      WHERE user_id = tc.client_id
        AND weight IS NOT NULL
      ORDER BY date DESC
      LIMIT 1
    ) as weight_latest,
    
    -- Latest VO2 max
    (
      SELECT vo2_max
      FROM daily_health_summary
      WHERE user_id = tc.client_id
        AND vo2_max IS NOT NULL
      ORDER BY date DESC
      LIMIT 1
    ) as vo2max_latest
    
  FROM trainer_clients tc
  JOIN profiles p ON p.user_id = tc.client_id
  WHERE tc.trainer_id = p_trainer_id
    AND tc.active = true
  ORDER BY last_activity_date DESC NULLS LAST, p.full_name;
END;
$$;

-- Function: Get challenge participant goals with current progress
CREATE OR REPLACE FUNCTION get_challenge_participant_goals_with_progress(
  p_challenge_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
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
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id as goal_id,
    g.goal_name,
    g.goal_type,
    g.target_value,
    g.target_unit,
    
    -- Current value from latest measurement
    COALESCE((
      SELECT m.value
      FROM measurements m
      WHERE m.goal_id = g.id
        AND m.user_id = p_user_id
      ORDER BY m.measurement_date DESC
      LIMIT 1
    ), 0) as current_value,
    
    -- Progress percentage
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
    
    -- Last measurement date
    (
      SELECT m.measurement_date
      FROM measurements m
      WHERE m.goal_id = g.id
        AND m.user_id = p_user_id
      ORDER BY m.measurement_date DESC
      LIMIT 1
    ) as last_measurement_date,
    
    -- Total measurements count
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