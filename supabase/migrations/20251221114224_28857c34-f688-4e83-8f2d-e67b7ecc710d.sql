-- ============================================
-- Create challenge_leaderboard_v2 and variants
-- ============================================

-- Base view: All-time leaderboard
CREATE OR REPLACE VIEW challenge_leaderboard_v2 AS
SELECT 
  cp.user_id,
  cp.challenge_id,
  p.username,
  p.full_name,
  p.avatar_url,
  COALESCE((
    SELECT SUM(xh.xp_earned)::INTEGER 
    FROM xp_history xh 
    WHERE xh.user_id = cp.user_id
  ), 0) as total_points,
  public.calculate_streak_days(cp.user_id, CURRENT_DATE) as streak_days,
  COALESCE((
    SELECT COUNT(DISTINCT measurement_date)::BIGINT 
    FROM unified_metrics um 
    WHERE um.user_id = cp.user_id
  ), 0) as active_days,
  COALESCE((
    SELECT COUNT(DISTINCT measurement_date)::BIGINT 
    FROM unified_metrics um 
    WHERE um.user_id = cp.user_id
  ), 0) as days_with_data,
  (
    SELECT MAX(measurement_date) 
    FROM unified_metrics um 
    WHERE um.user_id = cp.user_id
  ) as last_activity_date,
  -- Steps metrics
  COALESCE((
    SELECT SUM(value) 
    FROM unified_metrics um 
    WHERE um.user_id = cp.user_id AND um.metric_name = 'Steps'
  ), 0) as total_steps,
  COALESCE((
    SELECT SUM(value) 
    FROM unified_metrics um 
    WHERE um.user_id = cp.user_id 
      AND um.metric_name = 'Steps' 
      AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'
  ), 0) as steps_last_7d,
  -- Calories
  COALESCE((
    SELECT SUM(value) 
    FROM unified_metrics um 
    WHERE um.user_id = cp.user_id AND um.metric_name = 'Active Calories'
  ), 0) as total_calories,
  -- Strain
  COALESCE((
    SELECT AVG(value) 
    FROM unified_metrics um 
    WHERE um.user_id = cp.user_id AND um.metric_name = 'Day Strain'
  ), 0) as avg_strain,
  COALESCE((
    SELECT AVG(value) 
    FROM unified_metrics um 
    WHERE um.user_id = cp.user_id 
      AND um.metric_name = 'Day Strain' 
      AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'
  ), 0) as avg_strain_last_7d,
  -- Workouts
  COALESCE((
    SELECT COUNT(*)::BIGINT 
    FROM workouts w 
    WHERE w.user_id = cp.user_id
  ), 0) as total_workouts,
  COALESCE((
    SELECT COUNT(*)::BIGINT 
    FROM workouts w 
    WHERE w.user_id = cp.user_id 
      AND w.start_time >= CURRENT_DATE - INTERVAL '7 days'
  ), 0) as workouts_last_7d,
  -- Sleep
  COALESCE((
    SELECT AVG(value) 
    FROM unified_metrics um 
    WHERE um.user_id = cp.user_id AND um.metric_name = 'Sleep Duration'
  ), 0) as avg_sleep,
  COALESCE((
    SELECT AVG(value) 
    FROM unified_metrics um 
    WHERE um.user_id = cp.user_id AND um.metric_name = 'Sleep Efficiency'
  ), 0) as avg_sleep_efficiency,
  COALESCE((
    SELECT AVG(value) 
    FROM unified_metrics um 
    WHERE um.user_id = cp.user_id 
      AND um.metric_name = 'Sleep Duration' 
      AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'
  ), 0) as avg_sleep_last_7d,
  -- Recovery
  COALESCE((
    SELECT AVG(value) 
    FROM unified_metrics um 
    WHERE um.user_id = cp.user_id AND um.metric_name = 'Recovery Score'
  ), 0) as avg_recovery,
  COALESCE((
    SELECT AVG(value) 
    FROM unified_metrics um 
    WHERE um.user_id = cp.user_id 
      AND um.metric_name = 'Recovery Score' 
      AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'
  ), 0) as avg_recovery_last_7d,
  -- HRV & HR
  COALESCE((
    SELECT AVG(value) 
    FROM unified_metrics um 
    WHERE um.user_id = cp.user_id AND um.metric_name = 'HRV'
  ), 0) as avg_hrv,
  COALESCE((
    SELECT AVG(value) 
    FROM unified_metrics um 
    WHERE um.user_id = cp.user_id AND um.metric_name = 'Resting Heart Rate'
  ), 0) as avg_resting_hr,
  -- Body composition
  (
    SELECT value 
    FROM unified_metrics um 
    WHERE um.user_id = cp.user_id AND um.metric_name = 'Weight'
    ORDER BY measurement_date DESC LIMIT 1
  ) as latest_weight,
  (
    SELECT value 
    FROM unified_metrics um 
    WHERE um.user_id = cp.user_id AND um.metric_name = 'Body Fat Percentage'
    ORDER BY measurement_date DESC LIMIT 1
  ) as latest_body_fat,
  -- Weekly consistency (days with data in last 7 days / 7)
  COALESCE((
    SELECT (COUNT(DISTINCT measurement_date)::NUMERIC / 7 * 100)
    FROM unified_metrics um 
    WHERE um.user_id = cp.user_id 
      AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'
  ), 0) as weekly_consistency
FROM challenge_participants cp
JOIN profiles p ON p.user_id = cp.user_id;

-- Weekly leaderboard view
CREATE OR REPLACE VIEW challenge_leaderboard_week AS
SELECT 
  cp.user_id,
  cp.challenge_id,
  p.username,
  p.full_name,
  p.avatar_url,
  COALESCE((
    SELECT SUM(xh.xp_earned)::INTEGER 
    FROM xp_history xh 
    WHERE xh.user_id = cp.user_id 
      AND xh.earned_at >= CURRENT_DATE - INTERVAL '7 days'
  ), 0) as total_points,
  public.calculate_streak_days(cp.user_id, CURRENT_DATE) as streak_days,
  COALESCE((
    SELECT COUNT(DISTINCT measurement_date)::BIGINT 
    FROM unified_metrics um 
    WHERE um.user_id = cp.user_id 
      AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'
  ), 0) as active_days,
  COALESCE((
    SELECT COUNT(DISTINCT measurement_date)::BIGINT 
    FROM unified_metrics um 
    WHERE um.user_id = cp.user_id 
      AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'
  ), 0) as days_with_data,
  (
    SELECT MAX(measurement_date) 
    FROM unified_metrics um 
    WHERE um.user_id = cp.user_id 
      AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'
  ) as last_activity_date,
  COALESCE((SELECT SUM(value) FROM unified_metrics um WHERE um.user_id = cp.user_id AND um.metric_name = 'Steps' AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'), 0) as total_steps,
  COALESCE((SELECT SUM(value) FROM unified_metrics um WHERE um.user_id = cp.user_id AND um.metric_name = 'Steps' AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'), 0) as steps_last_7d,
  COALESCE((SELECT SUM(value) FROM unified_metrics um WHERE um.user_id = cp.user_id AND um.metric_name = 'Active Calories' AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'), 0) as total_calories,
  COALESCE((SELECT AVG(value) FROM unified_metrics um WHERE um.user_id = cp.user_id AND um.metric_name = 'Day Strain' AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'), 0) as avg_strain,
  COALESCE((SELECT AVG(value) FROM unified_metrics um WHERE um.user_id = cp.user_id AND um.metric_name = 'Day Strain' AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'), 0) as avg_strain_last_7d,
  COALESCE((SELECT COUNT(*)::BIGINT FROM workouts w WHERE w.user_id = cp.user_id AND w.start_time >= CURRENT_DATE - INTERVAL '7 days'), 0) as total_workouts,
  COALESCE((SELECT COUNT(*)::BIGINT FROM workouts w WHERE w.user_id = cp.user_id AND w.start_time >= CURRENT_DATE - INTERVAL '7 days'), 0) as workouts_last_7d,
  COALESCE((SELECT AVG(value) FROM unified_metrics um WHERE um.user_id = cp.user_id AND um.metric_name = 'Sleep Duration' AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'), 0) as avg_sleep,
  COALESCE((SELECT AVG(value) FROM unified_metrics um WHERE um.user_id = cp.user_id AND um.metric_name = 'Sleep Efficiency' AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'), 0) as avg_sleep_efficiency,
  COALESCE((SELECT AVG(value) FROM unified_metrics um WHERE um.user_id = cp.user_id AND um.metric_name = 'Sleep Duration' AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'), 0) as avg_sleep_last_7d,
  COALESCE((SELECT AVG(value) FROM unified_metrics um WHERE um.user_id = cp.user_id AND um.metric_name = 'Recovery Score' AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'), 0) as avg_recovery,
  COALESCE((SELECT AVG(value) FROM unified_metrics um WHERE um.user_id = cp.user_id AND um.metric_name = 'Recovery Score' AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'), 0) as avg_recovery_last_7d,
  COALESCE((SELECT AVG(value) FROM unified_metrics um WHERE um.user_id = cp.user_id AND um.metric_name = 'HRV' AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'), 0) as avg_hrv,
  COALESCE((SELECT AVG(value) FROM unified_metrics um WHERE um.user_id = cp.user_id AND um.metric_name = 'Resting Heart Rate' AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'), 0) as avg_resting_hr,
  (SELECT value FROM unified_metrics um WHERE um.user_id = cp.user_id AND um.metric_name = 'Weight' AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days' ORDER BY measurement_date DESC LIMIT 1) as latest_weight,
  (SELECT value FROM unified_metrics um WHERE um.user_id = cp.user_id AND um.metric_name = 'Body Fat Percentage' AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days' ORDER BY measurement_date DESC LIMIT 1) as latest_body_fat,
  COALESCE((SELECT (COUNT(DISTINCT measurement_date)::NUMERIC / 7 * 100) FROM unified_metrics um WHERE um.user_id = cp.user_id AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'), 0) as weekly_consistency
FROM challenge_participants cp
JOIN profiles p ON p.user_id = cp.user_id;

-- Monthly leaderboard view  
CREATE OR REPLACE VIEW challenge_leaderboard_month AS
SELECT 
  cp.user_id,
  cp.challenge_id,
  p.username,
  p.full_name,
  p.avatar_url,
  COALESCE((
    SELECT SUM(xh.xp_earned)::INTEGER 
    FROM xp_history xh 
    WHERE xh.user_id = cp.user_id 
      AND xh.earned_at >= CURRENT_DATE - INTERVAL '30 days'
  ), 0) as total_points,
  public.calculate_streak_days(cp.user_id, CURRENT_DATE) as streak_days,
  COALESCE((
    SELECT COUNT(DISTINCT measurement_date)::BIGINT 
    FROM unified_metrics um 
    WHERE um.user_id = cp.user_id 
      AND um.measurement_date >= CURRENT_DATE - INTERVAL '30 days'
  ), 0) as active_days,
  COALESCE((
    SELECT COUNT(DISTINCT measurement_date)::BIGINT 
    FROM unified_metrics um 
    WHERE um.user_id = cp.user_id 
      AND um.measurement_date >= CURRENT_DATE - INTERVAL '30 days'
  ), 0) as days_with_data,
  (
    SELECT MAX(measurement_date) 
    FROM unified_metrics um 
    WHERE um.user_id = cp.user_id 
      AND um.measurement_date >= CURRENT_DATE - INTERVAL '30 days'
  ) as last_activity_date,
  COALESCE((SELECT SUM(value) FROM unified_metrics um WHERE um.user_id = cp.user_id AND um.metric_name = 'Steps' AND um.measurement_date >= CURRENT_DATE - INTERVAL '30 days'), 0) as total_steps,
  COALESCE((SELECT SUM(value) FROM unified_metrics um WHERE um.user_id = cp.user_id AND um.metric_name = 'Steps' AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'), 0) as steps_last_7d,
  COALESCE((SELECT SUM(value) FROM unified_metrics um WHERE um.user_id = cp.user_id AND um.metric_name = 'Active Calories' AND um.measurement_date >= CURRENT_DATE - INTERVAL '30 days'), 0) as total_calories,
  COALESCE((SELECT AVG(value) FROM unified_metrics um WHERE um.user_id = cp.user_id AND um.metric_name = 'Day Strain' AND um.measurement_date >= CURRENT_DATE - INTERVAL '30 days'), 0) as avg_strain,
  COALESCE((SELECT AVG(value) FROM unified_metrics um WHERE um.user_id = cp.user_id AND um.metric_name = 'Day Strain' AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'), 0) as avg_strain_last_7d,
  COALESCE((SELECT COUNT(*)::BIGINT FROM workouts w WHERE w.user_id = cp.user_id AND w.start_time >= CURRENT_DATE - INTERVAL '30 days'), 0) as total_workouts,
  COALESCE((SELECT COUNT(*)::BIGINT FROM workouts w WHERE w.user_id = cp.user_id AND w.start_time >= CURRENT_DATE - INTERVAL '7 days'), 0) as workouts_last_7d,
  COALESCE((SELECT AVG(value) FROM unified_metrics um WHERE um.user_id = cp.user_id AND um.metric_name = 'Sleep Duration' AND um.measurement_date >= CURRENT_DATE - INTERVAL '30 days'), 0) as avg_sleep,
  COALESCE((SELECT AVG(value) FROM unified_metrics um WHERE um.user_id = cp.user_id AND um.metric_name = 'Sleep Efficiency' AND um.measurement_date >= CURRENT_DATE - INTERVAL '30 days'), 0) as avg_sleep_efficiency,
  COALESCE((SELECT AVG(value) FROM unified_metrics um WHERE um.user_id = cp.user_id AND um.metric_name = 'Sleep Duration' AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'), 0) as avg_sleep_last_7d,
  COALESCE((SELECT AVG(value) FROM unified_metrics um WHERE um.user_id = cp.user_id AND um.metric_name = 'Recovery Score' AND um.measurement_date >= CURRENT_DATE - INTERVAL '30 days'), 0) as avg_recovery,
  COALESCE((SELECT AVG(value) FROM unified_metrics um WHERE um.user_id = cp.user_id AND um.metric_name = 'Recovery Score' AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'), 0) as avg_recovery_last_7d,
  COALESCE((SELECT AVG(value) FROM unified_metrics um WHERE um.user_id = cp.user_id AND um.metric_name = 'HRV' AND um.measurement_date >= CURRENT_DATE - INTERVAL '30 days'), 0) as avg_hrv,
  COALESCE((SELECT AVG(value) FROM unified_metrics um WHERE um.user_id = cp.user_id AND um.metric_name = 'Resting Heart Rate' AND um.measurement_date >= CURRENT_DATE - INTERVAL '30 days'), 0) as avg_resting_hr,
  (SELECT value FROM unified_metrics um WHERE um.user_id = cp.user_id AND um.metric_name = 'Weight' AND um.measurement_date >= CURRENT_DATE - INTERVAL '30 days' ORDER BY measurement_date DESC LIMIT 1) as latest_weight,
  (SELECT value FROM unified_metrics um WHERE um.user_id = cp.user_id AND um.metric_name = 'Body Fat Percentage' AND um.measurement_date >= CURRENT_DATE - INTERVAL '30 days' ORDER BY measurement_date DESC LIMIT 1) as latest_body_fat,
  COALESCE((SELECT (COUNT(DISTINCT measurement_date)::NUMERIC / 7 * 100) FROM unified_metrics um WHERE um.user_id = cp.user_id AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'), 0) as weekly_consistency
FROM challenge_participants cp
JOIN profiles p ON p.user_id = cp.user_id;

-- ============================================
-- Fix sync_inbody_to_unified function
-- ============================================

CREATE OR REPLACE FUNCTION public.sync_inbody_to_unified()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert core metrics using correct column names
  INSERT INTO unified_metrics (
    user_id, metric_name, metric_category, value, unit, 
    source, provider, measurement_date, priority, quality_score, is_primary
  ) VALUES
    (NEW.user_id, 'Weight', 'body_composition', NEW.weight, 'kg', 'inbody', 'inbody', NEW.test_date, 1, 95, true),
    (NEW.user_id, 'Body Fat Percentage', 'body_composition', NEW.percent_body_fat, '%', 'inbody', 'inbody', NEW.test_date, 1, 95, true),
    (NEW.user_id, 'Muscle Mass', 'body_composition', NEW.skeletal_muscle_mass, 'kg', 'inbody', 'inbody', NEW.test_date, 1, 95, true),
    (NEW.user_id, 'Skeletal Muscle Mass', 'body_composition', NEW.skeletal_muscle_mass, 'kg', 'inbody', 'inbody', NEW.test_date, 1, 95, true),
    (NEW.user_id, 'BMI', 'body_composition', NEW.bmi, 'kg/m²', 'inbody', 'inbody', NEW.test_date, 1, 95, true),
    (NEW.user_id, 'BMR', 'body_composition', NEW.bmr, 'kcal', 'inbody', 'inbody', NEW.test_date, 1, 95, true)
  ON CONFLICT (user_id, metric_name, measurement_date, source) 
  DO UPDATE SET 
    value = EXCLUDED.value,
    quality_score = EXCLUDED.quality_score,
    is_primary = EXCLUDED.is_primary,
    updated_at = now();

  RETURN NEW;
END;
$function$;

-- ============================================
-- Add search_path to critical functions
-- ============================================

-- Fix is_team_member (already has search_path but ensure it's set)
ALTER FUNCTION public.is_team_member(uuid, uuid) SET search_path TO 'public';

-- Fix can_view_profile  
ALTER FUNCTION public.can_view_profile(uuid, uuid) SET search_path TO 'public';

-- Fix calculate_streak_days
ALTER FUNCTION public.calculate_streak_days(uuid, date) SET search_path TO 'public';