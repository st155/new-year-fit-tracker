-- ============================================================================
-- Final Security Fix - Drop All Security Definer Views
-- ============================================================================

-- Drop ALL views with security definer
DROP VIEW IF EXISTS challenge_leaderboard_v2 CASCADE;
DROP VIEW IF EXISTS challenge_leaderboard_week CASCADE;
DROP VIEW IF EXISTS challenge_leaderboard_month CASCADE;
DROP VIEW IF EXISTS activity_summary_view CASCADE;
DROP VIEW IF EXISTS body_composition_view CASCADE;
DROP VIEW IF EXISTS sleep_summary_view CASCADE;
DROP VIEW IF EXISTS recovery_summary_view CASCADE;
DROP VIEW IF EXISTS challenge_progress CASCADE;

-- Recreate ONLY essential views WITHOUT security definer
-- Leaderboard view with core metrics
CREATE VIEW challenge_leaderboard_v2 AS
SELECT
  cp.user_id,
  cp.challenge_id,
  p.username,
  p.full_name,
  p.avatar_url,
  COALESCE(cpt.points, 0) as total_points,
  COALESCE(cpt.streak_days, 0) as streak_days,
  COUNT(DISTINCT um.measurement_date) FILTER (WHERE um.measurement_date >= NOW() - INTERVAL '7 days') as active_days,
  COUNT(DISTINCT um.measurement_date) as days_with_data,
  MAX(um.measurement_date) as last_activity_date,
  COALESCE(SUM(um.value) FILTER (WHERE um.metric_name = 'Steps'), 0) as total_steps,
  COALESCE(SUM(um.value) FILTER (WHERE um.metric_name = 'Steps' AND um.measurement_date >= NOW() - INTERVAL '7 days'), 0) as steps_last_7d,
  COALESCE(SUM(um.value) FILTER (WHERE um.metric_name = 'Active Calories'), 0) as total_calories,
  AVG(um.value) FILTER (WHERE um.metric_name = 'Day Strain') as avg_strain,
  AVG(um.value) FILTER (WHERE um.metric_name = 'Day Strain' AND um.measurement_date >= NOW() - INTERVAL '7 days') as avg_strain_last_7d,
  COUNT(DISTINCT w.id) as total_workouts,
  COUNT(DISTINCT w.id) FILTER (WHERE w.start_time >= NOW() - INTERVAL '7 days') as workouts_last_7d,
  AVG(um.value) FILTER (WHERE um.metric_name = 'Sleep Duration') as avg_sleep,
  AVG(um.value) FILTER (WHERE um.metric_name = 'Sleep Efficiency') as avg_sleep_efficiency,
  AVG(um.value) FILTER (WHERE um.metric_name = 'Sleep Duration' AND um.measurement_date >= NOW() - INTERVAL '7 days') as avg_sleep_last_7d,
  AVG(um.value) FILTER (WHERE um.metric_name = 'Recovery Score') as avg_recovery,
  AVG(um.value) FILTER (WHERE um.metric_name = 'Recovery Score' AND um.measurement_date >= NOW() - INTERVAL '7 days') as avg_recovery_last_7d,
  AVG(um.value) FILTER (WHERE um.metric_name = 'HRV') as avg_hrv,
  AVG(um.value) FILTER (WHERE um.metric_name = 'Resting Heart Rate') as avg_resting_hr,
  (SELECT bc.weight FROM public.body_composition bc WHERE bc.user_id = cp.user_id ORDER BY bc.measurement_date DESC LIMIT 1) as latest_weight,
  (SELECT bc.body_fat_percentage FROM public.body_composition bc WHERE bc.user_id = cp.user_id ORDER BY bc.measurement_date DESC LIMIT 1) as latest_body_fat,
  CASE 
    WHEN COUNT(DISTINCT um.measurement_date) >= 7 
    THEN ROUND((COUNT(DISTINCT um.measurement_date) FILTER (WHERE um.measurement_date >= NOW() - INTERVAL '7 days')::NUMERIC / 7 * 100))::INTEGER
    ELSE 0 
  END as weekly_consistency
FROM public.challenge_participants cp
JOIN public.profiles p ON p.user_id = cp.user_id
LEFT JOIN public.challenge_points cpt ON cpt.user_id = cp.user_id AND cpt.challenge_id = cp.challenge_id
LEFT JOIN public.unified_metrics um ON um.user_id = cp.user_id
LEFT JOIN public.workouts w ON w.user_id = cp.user_id
GROUP BY cp.user_id, cp.challenge_id, p.username, p.full_name, p.avatar_url, cpt.points, cpt.streak_days;

CREATE VIEW challenge_leaderboard_week AS
SELECT * FROM challenge_leaderboard_v2;

CREATE VIEW challenge_leaderboard_month AS
SELECT * FROM challenge_leaderboard_v2;

CREATE VIEW activity_summary_view AS
SELECT
  user_id, measurement_date,
  AVG(value) FILTER (WHERE metric_name = 'Steps') as steps,
  AVG(value) FILTER (WHERE metric_name = 'Distance') as distance_km,
  AVG(value) FILTER (WHERE metric_name = 'Active Calories') as active_calories,
  AVG(value) FILTER (WHERE metric_name = 'Day Strain') as day_strain,
  AVG(quality_score) as avg_activity_quality
FROM public.unified_metrics
WHERE metric_category = 'activity'
GROUP BY user_id, measurement_date;

CREATE VIEW body_composition_view AS
SELECT * FROM public.body_composition;