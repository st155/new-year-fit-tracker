-- CRITICAL FIX: Deduplication of metrics before aggregation
-- Problem: Users with multiple wearables (WHOOP, OURA, GARMIN) had metrics summed/averaged
--          across all devices instead of using highest priority source.
-- Solution: Use DISTINCT ON with priority ordering to select one source per metric per day.
-- Impact: Fixes inflated step counts and incorrect sleep averages in leaderboards.

-- Drop existing views
DROP VIEW IF EXISTS challenge_leaderboard_week CASCADE;
DROP VIEW IF EXISTS challenge_leaderboard_month CASCADE;

-- Recreate challenge_leaderboard_week with deduplication
CREATE VIEW challenge_leaderboard_week AS
WITH deduplicated_metrics AS (
  SELECT DISTINCT ON (user_id, metric_name, measurement_date)
    user_id,
    metric_name,
    value,
    measurement_date,
    priority,
    source
  FROM unified_metrics
  WHERE deleted_at IS NULL
    AND measurement_date >= CURRENT_DATE - INTERVAL '7 days'
  ORDER BY user_id, metric_name, measurement_date, priority ASC, created_at DESC
),
user_metrics_agg AS (
  SELECT
    cp.user_id,
    cp.challenge_id,
    COALESCE(SUM(CASE WHEN dm.metric_name = 'Steps' THEN dm.value END), 0) as steps_last_7d,
    COALESCE(AVG(CASE WHEN dm.metric_name = 'Sleep Duration' THEN dm.value END), 0) as avg_sleep_last_7d,
    COALESCE(AVG(CASE WHEN dm.metric_name = 'Sleep Efficiency' THEN dm.value END), 0) as avg_sleep_efficiency,
    COALESCE(AVG(CASE WHEN dm.metric_name = 'Day Strain' THEN dm.value END), 0) as avg_strain_last_7d,
    COALESCE(AVG(CASE WHEN dm.metric_name = 'Recovery Score' THEN dm.value END), 0) as avg_recovery_last_7d,
    COALESCE(AVG(CASE WHEN dm.metric_name = 'Heart Rate Variability' THEN dm.value END), 0) as avg_hrv,
    COALESCE(AVG(CASE WHEN dm.metric_name = 'Resting Heart Rate' THEN dm.value END), 0) as avg_resting_hr,
    COUNT(DISTINCT dm.measurement_date) as days_with_data,
    MAX(dm.measurement_date) as last_activity_date
  FROM challenge_participants cp
  LEFT JOIN deduplicated_metrics dm ON dm.user_id = cp.user_id
  GROUP BY cp.user_id, cp.challenge_id
),
workout_metrics AS (
  SELECT
    cp.user_id,
    cp.challenge_id,
    COUNT(w.id) FILTER (WHERE w.start_time >= CURRENT_DATE - INTERVAL '7 days') as workouts_last_7d
  FROM challenge_participants cp
  LEFT JOIN workouts w ON w.user_id = cp.user_id
  GROUP BY cp.user_id, cp.challenge_id
),
latest_body_metrics AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    value as latest_weight
  FROM unified_metrics
  WHERE metric_name = 'Weight'
    AND deleted_at IS NULL
  ORDER BY user_id, measurement_date DESC, priority ASC, created_at DESC
),
latest_body_fat AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    value as latest_body_fat
  FROM unified_metrics
  WHERE metric_name = 'Body Fat Percentage'
    AND deleted_at IS NULL
  ORDER BY user_id, measurement_date DESC, priority ASC, created_at DESC
)
SELECT
  cp.user_id,
  cp.challenge_id,
  p.username,
  p.full_name,
  p.avatar_url,
  COALESCE(chp.points, 0) as total_points,
  public.calculate_streak_days(cp.user_id) as streak_days,
  COALESCE(uma.days_with_data, 0) as active_days,
  COALESCE(uma.days_with_data, 0) as days_with_data,
  uma.last_activity_date,
  0 as total_steps,
  COALESCE(uma.steps_last_7d, 0) as steps_last_7d,
  0 as total_calories,
  0 as avg_strain,
  COALESCE(uma.avg_strain_last_7d, 0) as avg_strain_last_7d,
  0 as total_workouts,
  COALESCE(wm.workouts_last_7d, 0) as workouts_last_7d,
  0 as avg_sleep,
  COALESCE(uma.avg_sleep_efficiency, 0) as avg_sleep_efficiency,
  COALESCE(uma.avg_sleep_last_7d, 0) as avg_sleep_last_7d,
  0 as avg_recovery,
  COALESCE(uma.avg_recovery_last_7d, 0) as avg_recovery_last_7d,
  COALESCE(uma.avg_hrv, 0) as avg_hrv,
  COALESCE(uma.avg_resting_hr, 0) as avg_resting_hr,
  lbm.latest_weight,
  lbf.latest_body_fat,
  CASE 
    WHEN uma.days_with_data >= 5 THEN 100
    WHEN uma.days_with_data >= 3 THEN 75
    WHEN uma.days_with_data >= 1 THEN 50
    ELSE 0
  END as weekly_consistency
FROM challenge_participants cp
JOIN profiles p ON p.user_id = cp.user_id
LEFT JOIN challenge_points chp ON chp.user_id = cp.user_id AND chp.challenge_id = cp.challenge_id
LEFT JOIN user_metrics_agg uma ON uma.user_id = cp.user_id AND uma.challenge_id = cp.challenge_id
LEFT JOIN workout_metrics wm ON wm.user_id = cp.user_id AND wm.challenge_id = cp.challenge_id
LEFT JOIN latest_body_metrics lbm ON lbm.user_id = cp.user_id
LEFT JOIN latest_body_fat lbf ON lbf.user_id = cp.user_id;

-- Recreate challenge_leaderboard_month with deduplication
CREATE VIEW challenge_leaderboard_month AS
WITH deduplicated_metrics AS (
  SELECT DISTINCT ON (user_id, metric_name, measurement_date)
    user_id,
    metric_name,
    value,
    measurement_date,
    priority,
    source
  FROM unified_metrics
  WHERE deleted_at IS NULL
    AND measurement_date >= CURRENT_DATE - INTERVAL '30 days'
  ORDER BY user_id, metric_name, measurement_date, priority ASC, created_at DESC
),
user_metrics_agg AS (
  SELECT
    cp.user_id,
    cp.challenge_id,
    COALESCE(SUM(CASE WHEN dm.metric_name = 'Steps' THEN dm.value END), 0) as steps_last_30d,
    COALESCE(AVG(CASE WHEN dm.metric_name = 'Sleep Duration' THEN dm.value END), 0) as avg_sleep_last_30d,
    COALESCE(AVG(CASE WHEN dm.metric_name = 'Sleep Efficiency' THEN dm.value END), 0) as avg_sleep_efficiency,
    COALESCE(AVG(CASE WHEN dm.metric_name = 'Day Strain' THEN dm.value END), 0) as avg_strain_last_30d,
    COALESCE(AVG(CASE WHEN dm.metric_name = 'Recovery Score' THEN dm.value END), 0) as avg_recovery_last_30d,
    COALESCE(AVG(CASE WHEN dm.metric_name = 'Heart Rate Variability' THEN dm.value END), 0) as avg_hrv,
    COALESCE(AVG(CASE WHEN dm.metric_name = 'Resting Heart Rate' THEN dm.value END), 0) as avg_resting_hr,
    COUNT(DISTINCT dm.measurement_date) as days_with_data,
    MAX(dm.measurement_date) as last_activity_date
  FROM challenge_participants cp
  LEFT JOIN deduplicated_metrics dm ON dm.user_id = cp.user_id
  GROUP BY cp.user_id, cp.challenge_id
),
workout_metrics AS (
  SELECT
    cp.user_id,
    cp.challenge_id,
    COUNT(w.id) FILTER (WHERE w.start_time >= CURRENT_DATE - INTERVAL '30 days') as workouts_last_30d
  FROM challenge_participants cp
  LEFT JOIN workouts w ON w.user_id = cp.user_id
  GROUP BY cp.user_id, cp.challenge_id
),
latest_body_metrics AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    value as latest_weight
  FROM unified_metrics
  WHERE metric_name = 'Weight'
    AND deleted_at IS NULL
  ORDER BY user_id, measurement_date DESC, priority ASC, created_at DESC
),
latest_body_fat AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    value as latest_body_fat
  FROM unified_metrics
  WHERE metric_name = 'Body Fat Percentage'
    AND deleted_at IS NULL
  ORDER BY user_id, measurement_date DESC, priority ASC, created_at DESC
)
SELECT
  cp.user_id,
  cp.challenge_id,
  p.username,
  p.full_name,
  p.avatar_url,
  COALESCE(chp.points, 0) as total_points,
  public.calculate_streak_days(cp.user_id) as streak_days,
  COALESCE(uma.days_with_data, 0) as active_days,
  COALESCE(uma.days_with_data, 0) as days_with_data,
  uma.last_activity_date,
  COALESCE(uma.steps_last_30d, 0) as steps_last_30d,
  COALESCE(uma.avg_sleep_last_30d, 0) as avg_sleep_last_30d,
  COALESCE(uma.avg_sleep_efficiency, 0) as avg_sleep_efficiency,
  COALESCE(uma.avg_strain_last_30d, 0) as avg_strain_last_30d,
  COALESCE(uma.avg_recovery_last_30d, 0) as avg_recovery_last_30d,
  COALESCE(wm.workouts_last_30d, 0) as workouts_last_30d,
  COALESCE(uma.avg_hrv, 0) as avg_hrv,
  COALESCE(uma.avg_resting_hr, 0) as avg_resting_hr,
  lbm.latest_weight,
  lbf.latest_body_fat,
  CASE 
    WHEN uma.days_with_data >= 20 THEN 100
    WHEN uma.days_with_data >= 15 THEN 75
    WHEN uma.days_with_data >= 10 THEN 50
    ELSE 0
  END as monthly_consistency
FROM challenge_participants cp
JOIN profiles p ON p.user_id = cp.user_id
LEFT JOIN challenge_points chp ON chp.user_id = cp.user_id AND chp.challenge_id = cp.challenge_id
LEFT JOIN user_metrics_agg uma ON uma.user_id = cp.user_id AND uma.challenge_id = cp.challenge_id
LEFT JOIN workout_metrics wm ON wm.user_id = cp.user_id AND wm.challenge_id = cp.challenge_id
LEFT JOIN latest_body_metrics lbm ON lbm.user_id = cp.user_id
LEFT JOIN latest_body_fat lbf ON lbf.user_id = cp.user_id;