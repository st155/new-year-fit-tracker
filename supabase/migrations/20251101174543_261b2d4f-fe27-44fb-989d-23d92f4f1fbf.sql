-- Fix leaderboard views to properly join profiles table

-- 1. Fix challenge_leaderboard_v2
CREATE OR REPLACE VIEW public.challenge_leaderboard_v2 AS
WITH deduplicated_metrics AS (
  SELECT DISTINCT ON (unified_metrics.user_id, unified_metrics.metric_name, unified_metrics.measurement_date)
    unified_metrics.user_id,
    unified_metrics.metric_name,
    unified_metrics.value,
    unified_metrics.measurement_date,
    unified_metrics.priority,
    unified_metrics.created_at
  FROM unified_metrics
  ORDER BY unified_metrics.user_id, unified_metrics.metric_name, unified_metrics.measurement_date, unified_metrics.priority DESC, unified_metrics.created_at DESC
), user_metrics_agg AS (
  SELECT
    cp.user_id,
    cp.challenge_id,
    SUM(CASE WHEN dm.metric_name = 'Steps' THEN dm.value ELSE 0::numeric END) AS total_steps,
    COALESCE(AVG(CASE WHEN dm.metric_name = 'Steps' AND dm.measurement_date >= CURRENT_DATE - INTERVAL '7 days' THEN dm.value END), 0::numeric) AS steps_last_7d,
    SUM(CASE WHEN dm.metric_name = 'Active Calories' THEN dm.value ELSE 0::numeric END) AS total_calories,
    AVG(CASE WHEN dm.metric_name = 'Workout Strain' THEN dm.value END) AS avg_strain,
    COALESCE(AVG(CASE WHEN dm.metric_name = 'Workout Strain' AND dm.measurement_date >= CURRENT_DATE - INTERVAL '7 days' THEN dm.value END), 0::numeric) AS avg_strain_last_7d,
    COUNT(DISTINCT CASE WHEN dm.metric_name = 'Workout Strain' THEN dm.measurement_date END) AS total_workouts,
    COUNT(DISTINCT CASE WHEN dm.metric_name = 'Workout Strain' AND dm.measurement_date >= CURRENT_DATE - INTERVAL '7 days' THEN dm.measurement_date END) AS workouts_last_7d,
    AVG(CASE WHEN dm.metric_name = 'Sleep Duration' THEN dm.value END) AS avg_sleep,
    AVG(CASE WHEN dm.metric_name = 'Sleep Efficiency' THEN dm.value END) AS avg_sleep_efficiency,
    COALESCE(AVG(CASE WHEN dm.metric_name = 'Sleep Duration' AND dm.measurement_date >= CURRENT_DATE - INTERVAL '7 days' THEN dm.value END), 0::numeric) AS avg_sleep_last_7d,
    AVG(CASE WHEN dm.metric_name = 'Recovery Score' THEN dm.value END) AS avg_recovery,
    COALESCE(AVG(CASE WHEN dm.metric_name = 'Recovery Score' AND dm.measurement_date >= CURRENT_DATE - INTERVAL '7 days' THEN dm.value END), 0::numeric) AS avg_recovery_last_7d,
    AVG(CASE WHEN dm.metric_name = 'HRV' THEN dm.value END) AS avg_hrv,
    AVG(CASE WHEN dm.metric_name = 'Resting Heart Rate' THEN dm.value END) AS avg_resting_hr,
    (SELECT dm2.value FROM deduplicated_metrics dm2 WHERE dm2.user_id = cp.user_id AND dm2.metric_name = 'Weight' ORDER BY dm2.measurement_date DESC LIMIT 1) AS latest_weight,
    (SELECT dm2.value FROM deduplicated_metrics dm2 WHERE dm2.user_id = cp.user_id AND dm2.metric_name = 'Body Fat Percentage' ORDER BY dm2.measurement_date DESC LIMIT 1) AS latest_body_fat,
    COUNT(DISTINCT dm.measurement_date) AS days_with_data,
    MAX(dm.measurement_date) AS last_activity_date,
    (COUNT(DISTINCT CASE WHEN dm.measurement_date >= CURRENT_DATE - INTERVAL '7 days' THEN dm.measurement_date END)::double precision / 7.0) AS weekly_consistency
  FROM challenge_participants cp
  LEFT JOIN deduplicated_metrics dm ON dm.user_id = cp.user_id
  GROUP BY cp.user_id, cp.challenge_id
)
SELECT
  uma.challenge_id,
  uma.user_id,
  p.avatar_url,
  p.username,
  p.full_name,
  COALESCE(points.points, 0) AS total_points,
  uma.total_steps,
  uma.steps_last_7d,
  uma.total_calories,
  uma.avg_strain,
  uma.avg_strain_last_7d,
  uma.total_workouts,
  uma.workouts_last_7d,
  uma.avg_sleep,
  uma.avg_sleep_efficiency,
  uma.avg_sleep_last_7d,
  uma.avg_recovery,
  uma.avg_recovery_last_7d,
  uma.avg_hrv,
  uma.avg_resting_hr,
  uma.latest_weight,
  uma.latest_body_fat,
  uma.days_with_data,
  uma.last_activity_date,
  uma.weekly_consistency,
  calculate_streak_days(uma.user_id, CURRENT_DATE) AS streak_days
FROM user_metrics_agg uma
LEFT JOIN profiles p ON p.user_id = uma.user_id
LEFT JOIN challenge_points points ON points.user_id = uma.user_id AND points.challenge_id = uma.challenge_id
ORDER BY COALESCE(points.points, 0) DESC;

-- 2. Fix challenge_leaderboard_week
CREATE OR REPLACE VIEW public.challenge_leaderboard_week AS
WITH deduplicated_metrics AS (
  SELECT DISTINCT ON (unified_metrics.user_id, unified_metrics.metric_name, unified_metrics.measurement_date)
    unified_metrics.user_id,
    unified_metrics.metric_name,
    unified_metrics.value,
    unified_metrics.measurement_date,
    unified_metrics.priority,
    unified_metrics.created_at
  FROM unified_metrics
  WHERE unified_metrics.measurement_date >= CURRENT_DATE - INTERVAL '7 days'
  ORDER BY unified_metrics.user_id, unified_metrics.metric_name, unified_metrics.measurement_date, unified_metrics.priority DESC, unified_metrics.created_at DESC
), user_metrics_agg AS (
  SELECT
    cp.user_id,
    cp.challenge_id,
    SUM(CASE WHEN dm.metric_name = 'Steps' THEN dm.value ELSE 0::numeric END) AS total_steps,
    AVG(CASE WHEN dm.metric_name = 'Steps' THEN dm.value END) AS steps_last_7d,
    SUM(CASE WHEN dm.metric_name = 'Active Calories' THEN dm.value ELSE 0::numeric END) AS total_calories,
    AVG(CASE WHEN dm.metric_name = 'Workout Strain' THEN dm.value END) AS avg_strain,
    AVG(CASE WHEN dm.metric_name = 'Workout Strain' THEN dm.value END) AS avg_strain_last_7d,
    COUNT(DISTINCT CASE WHEN dm.metric_name = 'Workout Strain' THEN dm.measurement_date END) AS total_workouts,
    COUNT(DISTINCT CASE WHEN dm.metric_name = 'Workout Strain' THEN dm.measurement_date END) AS workouts_last_7d,
    AVG(CASE WHEN dm.metric_name = 'Sleep Duration' THEN dm.value END) AS avg_sleep,
    AVG(CASE WHEN dm.metric_name = 'Sleep Efficiency' THEN dm.value END) AS avg_sleep_efficiency,
    AVG(CASE WHEN dm.metric_name = 'Sleep Duration' THEN dm.value END) AS avg_sleep_last_7d,
    AVG(CASE WHEN dm.metric_name = 'Recovery Score' THEN dm.value END) AS avg_recovery,
    AVG(CASE WHEN dm.metric_name = 'Recovery Score' THEN dm.value END) AS avg_recovery_last_7d,
    AVG(CASE WHEN dm.metric_name = 'HRV' THEN dm.value END) AS avg_hrv,
    AVG(CASE WHEN dm.metric_name = 'Resting Heart Rate' THEN dm.value END) AS avg_resting_hr,
    (SELECT dm2.value FROM unified_metrics dm2 WHERE dm2.user_id = cp.user_id AND dm2.metric_name = 'Weight' ORDER BY dm2.measurement_date DESC, dm2.priority DESC LIMIT 1) AS latest_weight,
    (SELECT dm2.value FROM unified_metrics dm2 WHERE dm2.user_id = cp.user_id AND dm2.metric_name = 'Body Fat Percentage' ORDER BY dm2.measurement_date DESC, dm2.priority DESC LIMIT 1) AS latest_body_fat,
    COUNT(DISTINCT dm.measurement_date) AS days_with_data,
    COUNT(DISTINCT dm.measurement_date) AS active_days,
    MAX(dm.measurement_date) AS last_activity_date,
    (COUNT(DISTINCT dm.measurement_date)::double precision / 7.0) AS weekly_consistency
  FROM challenge_participants cp
  LEFT JOIN deduplicated_metrics dm ON dm.user_id = cp.user_id
  GROUP BY cp.user_id, cp.challenge_id
)
SELECT
  uma.challenge_id,
  uma.user_id,
  p.avatar_url,
  p.username,
  p.full_name,
  COALESCE(points.points, 0) AS total_points,
  uma.total_steps,
  uma.steps_last_7d,
  uma.total_calories,
  uma.total_calories AS total_active_calories,
  uma.avg_strain,
  uma.avg_strain_last_7d,
  uma.total_workouts,
  uma.workouts_last_7d,
  uma.avg_sleep,
  uma.avg_sleep_efficiency,
  uma.avg_sleep_last_7d,
  uma.avg_recovery,
  uma.avg_recovery_last_7d,
  uma.avg_hrv,
  uma.avg_resting_hr,
  uma.latest_weight,
  uma.latest_body_fat,
  uma.days_with_data,
  uma.active_days,
  uma.last_activity_date,
  uma.weekly_consistency,
  calculate_streak_days(uma.user_id, CURRENT_DATE) AS streak_days
FROM user_metrics_agg uma
LEFT JOIN profiles p ON p.user_id = uma.user_id
LEFT JOIN challenge_points points ON points.user_id = uma.user_id AND points.challenge_id = uma.challenge_id
ORDER BY COALESCE(points.points, 0) DESC;

-- 3. Fix challenge_leaderboard_month
CREATE OR REPLACE VIEW public.challenge_leaderboard_month AS
WITH deduplicated_metrics AS (
  SELECT DISTINCT ON (unified_metrics.user_id, unified_metrics.metric_name, unified_metrics.measurement_date)
    unified_metrics.user_id,
    unified_metrics.metric_name,
    unified_metrics.value,
    unified_metrics.measurement_date,
    unified_metrics.priority,
    unified_metrics.created_at
  FROM unified_metrics
  WHERE unified_metrics.measurement_date >= CURRENT_DATE - INTERVAL '30 days'
  ORDER BY unified_metrics.user_id, unified_metrics.metric_name, unified_metrics.measurement_date, unified_metrics.priority DESC, unified_metrics.created_at DESC
), user_metrics_agg AS (
  SELECT
    cp.user_id,
    cp.challenge_id,
    SUM(CASE WHEN dm.metric_name = 'Steps' THEN dm.value ELSE 0::numeric END) AS total_steps,
    COALESCE(AVG(CASE WHEN dm.metric_name = 'Steps' AND dm.measurement_date >= CURRENT_DATE - INTERVAL '7 days' THEN dm.value END), 0::numeric) AS steps_last_7d,
    SUM(CASE WHEN dm.metric_name = 'Active Calories' THEN dm.value ELSE 0::numeric END) AS total_calories,
    AVG(CASE WHEN dm.metric_name = 'Workout Strain' THEN dm.value END) AS avg_strain,
    COALESCE(AVG(CASE WHEN dm.metric_name = 'Workout Strain' AND dm.measurement_date >= CURRENT_DATE - INTERVAL '7 days' THEN dm.value END), 0::numeric) AS avg_strain_last_7d,
    COUNT(DISTINCT CASE WHEN dm.metric_name = 'Workout Strain' THEN dm.measurement_date END) AS total_workouts,
    COUNT(DISTINCT CASE WHEN dm.metric_name = 'Workout Strain' AND dm.measurement_date >= CURRENT_DATE - INTERVAL '7 days' THEN dm.measurement_date END) AS workouts_last_7d,
    AVG(CASE WHEN dm.metric_name = 'Sleep Duration' THEN dm.value END) AS avg_sleep,
    AVG(CASE WHEN dm.metric_name = 'Sleep Efficiency' THEN dm.value END) AS avg_sleep_efficiency,
    COALESCE(AVG(CASE WHEN dm.metric_name = 'Sleep Duration' AND dm.measurement_date >= CURRENT_DATE - INTERVAL '7 days' THEN dm.value END), 0::numeric) AS avg_sleep_last_7d,
    AVG(CASE WHEN dm.metric_name = 'Recovery Score' THEN dm.value END) AS avg_recovery,
    COALESCE(AVG(CASE WHEN dm.metric_name = 'Recovery Score' AND dm.measurement_date >= CURRENT_DATE - INTERVAL '7 days' THEN dm.value END), 0::numeric) AS avg_recovery_last_7d,
    AVG(CASE WHEN dm.metric_name = 'HRV' THEN dm.value END) AS avg_hrv,
    AVG(CASE WHEN dm.metric_name = 'Resting Heart Rate' THEN dm.value END) AS avg_resting_hr,
    (SELECT dm2.value FROM unified_metrics dm2 WHERE dm2.user_id = cp.user_id AND dm2.metric_name = 'Weight' ORDER BY dm2.measurement_date DESC, dm2.priority DESC LIMIT 1) AS latest_weight,
    (SELECT dm2.value FROM unified_metrics dm2 WHERE dm2.user_id = cp.user_id AND dm2.metric_name = 'Body Fat Percentage' ORDER BY dm2.measurement_date DESC, dm2.priority DESC LIMIT 1) AS latest_body_fat,
    COUNT(DISTINCT dm.measurement_date) AS days_with_data,
    COUNT(DISTINCT dm.measurement_date) AS active_days,
    MAX(dm.measurement_date) AS last_activity_date,
    (COUNT(DISTINCT CASE WHEN dm.measurement_date >= CURRENT_DATE - INTERVAL '7 days' THEN dm.measurement_date END)::double precision / 7.0) AS weekly_consistency
  FROM challenge_participants cp
  LEFT JOIN deduplicated_metrics dm ON dm.user_id = cp.user_id
  GROUP BY cp.user_id, cp.challenge_id
)
SELECT
  uma.challenge_id,
  uma.user_id,
  p.avatar_url,
  p.username,
  p.full_name,
  COALESCE(points.points, 0) AS total_points,
  uma.total_steps,
  uma.steps_last_7d,
  uma.total_calories,
  uma.avg_strain,
  uma.avg_strain_last_7d,
  uma.total_workouts,
  uma.workouts_last_7d,
  uma.avg_sleep,
  uma.avg_sleep_efficiency,
  uma.avg_sleep_last_7d,
  uma.avg_recovery,
  uma.avg_recovery_last_7d,
  uma.avg_hrv,
  uma.avg_resting_hr,
  uma.latest_weight,
  uma.latest_body_fat,
  uma.days_with_data,
  uma.active_days,
  uma.last_activity_date,
  uma.weekly_consistency,
  calculate_streak_days(uma.user_id, CURRENT_DATE) AS streak_days
FROM user_metrics_agg uma
LEFT JOIN profiles p ON p.user_id = uma.user_id
LEFT JOIN challenge_points points ON points.user_id = uma.user_id AND points.challenge_id = uma.challenge_id
ORDER BY COALESCE(points.points, 0) DESC;

-- 4. Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);