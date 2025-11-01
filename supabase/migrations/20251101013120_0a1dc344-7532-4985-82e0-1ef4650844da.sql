-- ========================================
-- FIX SECURITY DEFINER VIEWS (CORRECTED)
-- ========================================

-- Drop views
DROP VIEW IF EXISTS public.challenge_leaderboard_v2 CASCADE;
DROP VIEW IF EXISTS public.trainer_client_summary CASCADE;

-- Recreate challenge_leaderboard_v2 without SECURITY DEFINER
CREATE OR REPLACE VIEW public.challenge_leaderboard_v2 AS
SELECT 
  cp.challenge_id,
  cp.user_id,
  p.username,
  p.full_name,
  p.avatar_url,
  COALESCE(cp_points.points, 0) as total_points,
  COALESCE((
    SELECT SUM(mv.value) 
    FROM metric_values mv
    JOIN user_metrics um ON um.id = mv.metric_id
    WHERE um.user_id = cp.user_id 
      AND um.metric_name = 'Steps'
      AND mv.measurement_date >= (SELECT start_date FROM challenges WHERE id = cp.challenge_id)
      AND mv.measurement_date <= (SELECT end_date FROM challenges WHERE id = cp.challenge_id)
  ), 0) as total_steps,
  COALESCE((
    SELECT SUM(mv.value) 
    FROM metric_values mv
    JOIN user_metrics um ON um.id = mv.metric_id
    WHERE um.user_id = cp.user_id 
      AND um.metric_name IN ('Active Calories', 'Calories Burned')
      AND mv.measurement_date >= (SELECT start_date FROM challenges WHERE id = cp.challenge_id)
      AND mv.measurement_date <= (SELECT end_date FROM challenges WHERE id = cp.challenge_id)
  ), 0) as total_calories,
  COALESCE((
    SELECT COUNT(*) 
    FROM workouts w
    WHERE w.user_id = cp.user_id 
      AND DATE(w.start_time) >= (SELECT start_date FROM challenges WHERE id = cp.challenge_id)
      AND DATE(w.start_time) <= (SELECT end_date FROM challenges WHERE id = cp.challenge_id)
  ), 0) as total_workouts,
  COALESCE((
    SELECT AVG(mv.value)
    FROM metric_values mv
    JOIN user_metrics um ON um.id = mv.metric_id
    WHERE um.user_id = cp.user_id 
      AND um.metric_name = 'Workout Strain'
      AND mv.measurement_date >= (SELECT start_date FROM challenges WHERE id = cp.challenge_id)
  ), 0) as avg_strain,
  COALESCE((
    SELECT AVG(mv.value)
    FROM metric_values mv
    JOIN user_metrics um ON um.id = mv.metric_id
    WHERE um.user_id = cp.user_id 
      AND um.metric_name = 'Sleep Duration'
      AND mv.measurement_date >= (SELECT start_date FROM challenges WHERE id = cp.challenge_id)
  ), 0) as avg_sleep,
  COALESCE((
    SELECT AVG(mv.value)
    FROM metric_values mv
    JOIN user_metrics um ON um.id = mv.metric_id
    WHERE um.user_id = cp.user_id 
      AND um.metric_name = 'Sleep Efficiency'
      AND mv.measurement_date >= (SELECT start_date FROM challenges WHERE id = cp.challenge_id)
  ), 0) as avg_sleep_efficiency,
  COALESCE((
    SELECT AVG(mv.value)
    FROM metric_values mv
    JOIN user_metrics um ON um.id = mv.metric_id
    WHERE um.user_id = cp.user_id 
      AND um.metric_name = 'Recovery Score'
      AND mv.measurement_date >= (SELECT start_date FROM challenges WHERE id = cp.challenge_id)
  ), 0) as avg_recovery,
  COALESCE((
    SELECT AVG(mv.value)
    FROM metric_values mv
    JOIN user_metrics um ON um.id = mv.metric_id
    WHERE um.user_id = cp.user_id 
      AND um.metric_name = 'HRV'
      AND mv.measurement_date >= (SELECT start_date FROM challenges WHERE id = cp.challenge_id)
  ), 0) as avg_hrv,
  COALESCE((
    SELECT AVG(mv.value)
    FROM metric_values mv
    JOIN user_metrics um ON um.id = mv.metric_id
    WHERE um.user_id = cp.user_id 
      AND um.metric_name = 'Resting Heart Rate'
      AND mv.measurement_date >= (SELECT start_date FROM challenges WHERE id = cp.challenge_id)
  ), 0) as avg_resting_hr,
  COALESCE((
    SELECT MAX(mv.measurement_date)
    FROM metric_values mv
    JOIN user_metrics um ON um.id = mv.metric_id
    WHERE um.user_id = cp.user_id
  ), NULL) as last_activity_date,
  COALESCE((
    SELECT COUNT(DISTINCT mv.measurement_date)
    FROM metric_values mv
    JOIN user_metrics um ON um.id = mv.metric_id
    WHERE um.user_id = cp.user_id 
      AND mv.measurement_date >= (SELECT start_date FROM challenges WHERE id = cp.challenge_id)
  ), 0) as days_with_data,
  COALESCE((
    SELECT SUM(mv.value)
    FROM metric_values mv
    JOIN user_metrics um ON um.id = mv.metric_id
    WHERE um.user_id = cp.user_id 
      AND um.metric_name = 'Steps'
      AND mv.measurement_date >= CURRENT_DATE - INTERVAL '7 days'
  ), 0) as steps_last_7d,
  COALESCE((
    SELECT COUNT(*)
    FROM workouts w
    WHERE w.user_id = cp.user_id 
      AND DATE(w.start_time) >= CURRENT_DATE - INTERVAL '7 days'
  ), 0) as workouts_last_7d,
  COALESCE((
    SELECT AVG(mv.value)
    FROM metric_values mv
    JOIN user_metrics um ON um.id = mv.metric_id
    WHERE um.user_id = cp.user_id 
      AND um.metric_name = 'Workout Strain'
      AND mv.measurement_date >= CURRENT_DATE - INTERVAL '7 days'
  ), 0) as avg_strain_last_7d,
  COALESCE((
    SELECT AVG(mv.value)
    FROM metric_values mv
    JOIN user_metrics um ON um.id = mv.metric_id
    WHERE um.user_id = cp.user_id 
      AND um.metric_name = 'Recovery Score'
      AND mv.measurement_date >= CURRENT_DATE - INTERVAL '7 days'
  ), 0) as avg_recovery_last_7d,
  COALESCE((
    SELECT AVG(mv.value)
    FROM metric_values mv
    JOIN user_metrics um ON um.id = mv.metric_id
    WHERE um.user_id = cp.user_id 
      AND um.metric_name = 'Sleep Duration'
      AND mv.measurement_date >= CURRENT_DATE - INTERVAL '7 days'
  ), 0) as avg_sleep_last_7d,
  COALESCE((
    SELECT COUNT(DISTINCT mv.measurement_date)
    FROM metric_values mv
    JOIN user_metrics um ON um.id = mv.metric_id
    WHERE um.user_id = cp.user_id 
      AND mv.measurement_date >= CURRENT_DATE - INTERVAL '7 days'
  )::double precision / 7 * 100, 0) as weekly_consistency,
  COALESCE((
    SELECT weight FROM body_composition
    WHERE user_id = cp.user_id
    ORDER BY measurement_date DESC
    LIMIT 1
  ), NULL) as latest_weight,
  COALESCE((
    SELECT body_fat_percentage FROM body_composition
    WHERE user_id = cp.user_id
    ORDER BY measurement_date DESC
    LIMIT 1
  ), NULL) as latest_body_fat,
  COALESCE((
    SELECT MAX(CASE 
      WHEN measurement_date = CURRENT_DATE THEN 1
      WHEN measurement_date = CURRENT_DATE - INTERVAL '1 day' THEN 1
      ELSE 0
    END)
    FROM metric_values mv
    JOIN user_metrics um ON um.id = mv.metric_id
    WHERE um.user_id = cp.user_id
  ), 0)::bigint as streak_days
FROM challenge_participants cp
LEFT JOIN profiles p ON p.user_id = cp.user_id
LEFT JOIN challenge_points cp_points ON cp_points.challenge_id = cp.challenge_id AND cp_points.user_id = cp.user_id;

GRANT SELECT ON public.challenge_leaderboard_v2 TO authenticated;


-- Recreate trainer_client_summary without SECURITY DEFINER
CREATE OR REPLACE VIEW public.trainer_client_summary AS
SELECT 
  tc.trainer_id,
  tc.client_id,
  p.username,
  p.full_name,
  p.avatar_url,
  COUNT(DISTINCT g.id) as active_goals_count,
  COUNT(DISTINCT m.id) FILTER (WHERE m.measurement_date >= CURRENT_DATE - INTERVAL '30 days') as recent_measurements_count,
  MAX(m.measurement_date) as last_activity_date,
  jsonb_build_object(
    'latest_weight', (SELECT weight FROM body_composition WHERE user_id = tc.client_id ORDER BY measurement_date DESC LIMIT 1),
    'latest_body_fat', (SELECT body_fat_percentage FROM body_composition WHERE user_id = tc.client_id ORDER BY measurement_date DESC LIMIT 1),
    'avg_sleep_7d', (
      SELECT AVG(mv.value)
      FROM metric_values mv
      JOIN user_metrics um ON um.id = mv.metric_id
      WHERE um.user_id = tc.client_id 
        AND um.metric_name = 'Sleep Duration'
        AND mv.measurement_date >= CURRENT_DATE - INTERVAL '7 days'
    ),
    'avg_recovery_7d', (
      SELECT AVG(mv.value)
      FROM metric_values mv
      JOIN user_metrics um ON um.id = mv.metric_id
      WHERE um.user_id = tc.client_id 
        AND um.metric_name = 'Recovery Score'
        AND mv.measurement_date >= CURRENT_DATE - INTERVAL '7 days'
    )
  ) as health_summary
FROM trainer_clients tc
JOIN profiles p ON p.user_id = tc.client_id
LEFT JOIN goals g ON g.user_id = tc.client_id AND g.is_personal = true
LEFT JOIN measurements m ON m.user_id = tc.client_id
WHERE tc.active = true
GROUP BY tc.trainer_id, tc.client_id, p.username, p.full_name, p.avatar_url;

GRANT SELECT ON public.trainer_client_summary TO authenticated;

COMMENT ON VIEW public.challenge_leaderboard_v2 IS 'Recreated without SECURITY DEFINER - uses RLS policies';
COMMENT ON VIEW public.trainer_client_summary IS 'Recreated without SECURITY DEFINER - uses RLS policies';
