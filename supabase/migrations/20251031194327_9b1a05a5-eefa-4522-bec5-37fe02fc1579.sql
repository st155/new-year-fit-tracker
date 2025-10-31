-- Drop existing view
DROP VIEW IF EXISTS challenge_leaderboard_v2;

-- Create updated view using unified_metrics
CREATE OR REPLACE VIEW challenge_leaderboard_v2 AS
WITH recent_metrics AS (
  SELECT 
    um.user_id,
    um.metric_name,
    um.value,
    um.measurement_date,
    um.source,
    um.priority,
    ROW_NUMBER() OVER (
      PARTITION BY um.user_id, um.metric_name, um.measurement_date 
      ORDER BY um.priority ASC, um.created_at DESC
    ) as rn
  FROM unified_metrics um
  WHERE um.measurement_date >= CURRENT_DATE - INTERVAL '30 days'
    AND um.value IS NOT NULL
),
deduplicated_metrics AS (
  SELECT 
    user_id,
    metric_name,
    value,
    measurement_date
  FROM recent_metrics
  WHERE rn = 1
),
user_aggregates AS (
  SELECT
    dm.user_id,
    COUNT(DISTINCT dm.measurement_date) as active_days,
    MAX(dm.measurement_date) as last_activity_date,
    AVG(CASE WHEN dm.metric_name = 'Recovery Score' THEN dm.value END) as avg_recovery,
    AVG(CASE WHEN dm.metric_name = 'Day Strain' THEN dm.value END) as avg_strain,
    AVG(CASE WHEN dm.metric_name = 'Sleep Duration' THEN dm.value END) as avg_sleep,
    AVG(CASE WHEN dm.metric_name = 'Sleep Efficiency' THEN dm.value END) as avg_sleep_efficiency,
    AVG(CASE WHEN dm.metric_name IN ('Resting Heart Rate', 'Resting HR') THEN dm.value END) as avg_resting_hr,
    AVG(CASE WHEN dm.metric_name IN ('HRV', 'HRV RMSSD') THEN dm.value END) as avg_hrv,
    SUM(CASE WHEN dm.metric_name = 'Steps' THEN dm.value END) as total_steps,
    SUM(CASE WHEN dm.metric_name = 'Active Calories' THEN dm.value END) as total_active_calories
  FROM deduplicated_metrics dm
  GROUP BY dm.user_id
),
daily_activity AS (
  SELECT DISTINCT 
    user_id, 
    measurement_date
  FROM deduplicated_metrics
  WHERE measurement_date <= CURRENT_DATE
),
activity_with_groups AS (
  SELECT
    user_id,
    measurement_date,
    measurement_date - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY measurement_date))::integer AS streak_group
  FROM daily_activity
),
latest_streak_group AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    streak_group
  FROM activity_with_groups
  ORDER BY user_id, measurement_date DESC
),
streak_calc AS (
  SELECT
    awg.user_id,
    COUNT(*) as streak_days
  FROM activity_with_groups awg
  INNER JOIN latest_streak_group lsg 
    ON awg.user_id = lsg.user_id 
    AND awg.streak_group = lsg.streak_group
  GROUP BY awg.user_id
)
SELECT
  p.id,
  p.full_name,
  p.username,
  p.avatar_url,
  ua.user_id,
  NULL::uuid as challenge_id,
  COALESCE(ua.active_days, 0) as active_days,
  COALESCE(sc.streak_days, 0) as streak_days,
  ua.last_activity_date,
  ROUND(COALESCE(ua.avg_recovery, 0)) as avg_recovery,
  ROUND(COALESCE(ua.avg_strain, 0), 1) as avg_strain,
  ROUND(COALESCE(ua.avg_sleep, 0), 1) as avg_sleep,
  ROUND(COALESCE(ua.avg_sleep_efficiency, 0)) as avg_sleep_efficiency,
  ROUND(COALESCE(ua.avg_resting_hr, 0)) as avg_resting_hr,
  ROUND(COALESCE(ua.avg_hrv, 0)) as avg_hrv,
  COALESCE(ua.total_steps, 0) as total_steps,
  COALESCE(ua.total_active_calories, 0) as total_active_calories,
  (
    COALESCE(ua.active_days, 0) * 10 +
    COALESCE(sc.streak_days, 0) * 5
  ) as total_points
FROM user_aggregates ua
LEFT JOIN profiles p ON p.id = ua.user_id
LEFT JOIN streak_calc sc ON sc.user_id = ua.user_id
ORDER BY total_points DESC, ua.active_days DESC;