-- Fix challenge_leaderboard_v2 view to include total_points and other missing columns

DROP VIEW IF EXISTS challenge_leaderboard_v2;

CREATE VIEW challenge_leaderboard_v2 AS
WITH active_participants AS (
  SELECT DISTINCT 
    cp.user_id,
    cp.challenge_id,
    p.username,
    p.full_name,
    p.avatar_url,
    c.start_date,
    c.end_date
  FROM challenge_participants cp
  JOIN challenges c ON c.id = cp.challenge_id
  LEFT JOIN profiles p ON p.id = cp.user_id
  WHERE c.is_active = true
),
deduplicated_metrics AS (
  SELECT DISTINCT ON (um.user_id, um.metric_name, um.measurement_date)
    um.user_id,
    um.metric_name,
    um.value,
    um.measurement_date,
    um.source,
    um.priority
  FROM unified_metrics um
  JOIN active_participants ap ON ap.user_id = um.user_id
  WHERE um.measurement_date >= ap.start_date 
    AND um.measurement_date <= COALESCE(ap.end_date, CURRENT_DATE)
  ORDER BY um.user_id, um.metric_name, um.measurement_date, um.priority, um.created_at DESC
),
metrics_summary AS (
  SELECT 
    user_id,
    SUM(CASE WHEN metric_name = 'Steps' THEN value ELSE 0 END) as total_steps,
    SUM(CASE WHEN metric_name = 'Active Calories' THEN value ELSE 0 END) as total_calories,
    COUNT(DISTINCT CASE WHEN metric_name = 'Day Strain' AND value > 10 THEN measurement_date END) as total_workouts,
    AVG(CASE WHEN metric_name = 'Day Strain' THEN value END) as avg_strain,
    AVG(CASE WHEN metric_name = 'Recovery Score' THEN value END) as avg_recovery,
    AVG(CASE WHEN metric_name = 'Hours of Sleep' THEN value END) as avg_sleep,
    AVG(CASE WHEN metric_name = 'Resting Heart Rate' THEN value END) as avg_resting_hr,
    AVG(CASE WHEN metric_name = 'Heart Rate Variability (HRV)' THEN value END) as avg_hrv,
    AVG(CASE WHEN metric_name = 'Sleep Efficiency' THEN value END) as avg_sleep_efficiency,
    MAX(CASE WHEN metric_name = 'Weight' THEN value END) as latest_weight,
    MAX(CASE WHEN metric_name = 'Body Fat %' THEN value END) as latest_body_fat,
    MAX(measurement_date) as last_activity_date
  FROM deduplicated_metrics
  GROUP BY user_id
),
weekly_metrics AS (
  SELECT 
    user_id,
    SUM(CASE WHEN metric_name = 'Steps' THEN value ELSE 0 END) as steps_last_7d,
    COUNT(DISTINCT CASE WHEN metric_name = 'Day Strain' AND value > 10 THEN measurement_date END) as workouts_last_7d,
    AVG(CASE WHEN metric_name = 'Day Strain' THEN value END) as avg_strain_last_7d,
    AVG(CASE WHEN metric_name = 'Recovery Score' THEN value END) as avg_recovery_last_7d,
    AVG(CASE WHEN metric_name = 'Hours of Sleep' THEN value END) as avg_sleep_last_7d,
    COUNT(DISTINCT measurement_date) as days_with_data
  FROM deduplicated_metrics
  WHERE measurement_date >= CURRENT_DATE - INTERVAL '7 days'
    AND measurement_date < CURRENT_DATE
  GROUP BY user_id
),
consistency_calc AS (
  SELECT 
    user_id,
    (COUNT(DISTINCT measurement_date)::float / 7.0 * 100) as weekly_consistency
  FROM deduplicated_metrics
  WHERE measurement_date >= CURRENT_DATE - INTERVAL '7 days'
    AND measurement_date < CURRENT_DATE
  GROUP BY user_id
),
streak_calculation AS (
  SELECT 
    user_id,
    COUNT(*) as streak_days
  FROM (
    SELECT DISTINCT user_id, measurement_date
    FROM deduplicated_metrics
    WHERE measurement_date >= CURRENT_DATE - INTERVAL '30 days'
  ) daily_data
  GROUP BY user_id
)
SELECT 
  ap.user_id,
  ap.challenge_id,
  ap.username,
  ap.full_name,
  ap.avatar_url,
  COALESCE(cp.points, 0) as total_points,
  COALESCE(ms.total_steps, 0) as total_steps,
  COALESCE(ms.total_calories, 0) as total_calories,
  COALESCE(ms.total_workouts, 0) as total_workouts,
  COALESCE(ms.avg_strain, 0) as avg_strain,
  COALESCE(ms.avg_recovery, 0) as avg_recovery,
  COALESCE(ms.avg_sleep, 0) as avg_sleep,
  COALESCE(ms.avg_resting_hr, 0) as avg_resting_hr,
  COALESCE(ms.avg_hrv, 0) as avg_hrv,
  COALESCE(ms.avg_sleep_efficiency, 0) as avg_sleep_efficiency,
  ms.latest_weight,
  ms.latest_body_fat,
  ms.last_activity_date,
  COALESCE(wm.steps_last_7d, 0) as steps_last_7d,
  COALESCE(wm.workouts_last_7d, 0) as workouts_last_7d,
  COALESCE(wm.avg_strain_last_7d, 0) as avg_strain_last_7d,
  COALESCE(wm.avg_recovery_last_7d, 0) as avg_recovery_last_7d,
  COALESCE(wm.avg_sleep_last_7d, 0) as avg_sleep_last_7d,
  COALESCE(cc.weekly_consistency, 0) as weekly_consistency,
  COALESCE(sc.streak_days, 0) as streak_days,
  COALESCE(wm.days_with_data, 0) as days_with_data
FROM active_participants ap
LEFT JOIN metrics_summary ms ON ms.user_id = ap.user_id
LEFT JOIN weekly_metrics wm ON wm.user_id = ap.user_id
LEFT JOIN consistency_calc cc ON cc.user_id = ap.user_id
LEFT JOIN streak_calculation sc ON sc.user_id = ap.user_id
LEFT JOIN challenge_points cp ON cp.user_id = ap.user_id AND cp.challenge_id = ap.challenge_id;