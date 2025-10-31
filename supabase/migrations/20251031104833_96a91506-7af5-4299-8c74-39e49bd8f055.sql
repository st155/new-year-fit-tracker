-- Fix challenge_leaderboard_v2: Add deduplication by source priority
-- Problem: Multiple sources for same metric on same date cause incorrect averages
-- Solution: Use DISTINCT ON with source priority (whoop > terra > garmin > ultrahuman > oura > withings)

DROP VIEW IF EXISTS challenge_leaderboard_v2;

CREATE OR REPLACE VIEW challenge_leaderboard_v2 AS
WITH active_challenges AS (
  SELECT id, start_date, end_date 
  FROM challenges 
  WHERE is_active = true
),
-- Deduplicate metrics by selecting highest priority source per day
deduplicated_metrics AS (
  SELECT DISTINCT ON (um.user_id, um.metric_name, mv.measurement_date)
    um.user_id,
    um.metric_name,
    mv.value,
    mv.measurement_date,
    um.source,
    CASE LOWER(um.source)
      WHEN 'whoop' THEN 1
      WHEN 'terra' THEN 2
      WHEN 'garmin' THEN 3
      WHEN 'ultrahuman' THEN 4
      WHEN 'oura' THEN 5
      WHEN 'withings' THEN 6
      ELSE 7
    END as source_priority
  FROM user_metrics um
  JOIN metric_values mv ON mv.metric_id = um.id
  WHERE mv.measurement_date >= CURRENT_DATE - INTERVAL '30 days'
  ORDER BY um.user_id, um.metric_name, mv.measurement_date, 
    CASE LOWER(um.source)
      WHEN 'whoop' THEN 1
      WHEN 'terra' THEN 2
      WHEN 'garmin' THEN 3
      WHEN 'ultrahuman' THEN 4
      WHEN 'oura' THEN 5
      WHEN 'withings' THEN 6
      ELSE 7
    END ASC
),
user_metrics_summary AS (
  SELECT 
    user_id,
    COUNT(DISTINCT measurement_date) as active_days,
    MAX(measurement_date) as last_activity_date,
    AVG(CASE WHEN metric_name = 'Recovery Score' THEN value END) as avg_recovery,
    AVG(CASE WHEN metric_name = 'Day Strain' THEN value END) as avg_strain,
    AVG(CASE WHEN metric_name = 'Sleep Duration' THEN value END) as avg_sleep,
    AVG(CASE WHEN metric_name = 'Sleep Efficiency' THEN value END) as avg_sleep_efficiency,
    AVG(CASE WHEN metric_name = 'Resting HR' THEN value END) as avg_resting_hr,
    AVG(CASE WHEN metric_name = 'HRV RMSSD' THEN value END) as avg_hrv,
    -- For Steps and Active Calories, take max per day then sum (to avoid duplicates)
    SUM(CASE WHEN metric_name = 'Steps' THEN value END) as total_steps,
    SUM(CASE WHEN metric_name = 'Active Calories' THEN value END) as total_active_calories
  FROM deduplicated_metrics
  GROUP BY user_id
),
streak_calculation AS (
  SELECT 
    user_id,
    COUNT(DISTINCT measurement_date) as streak_days
  FROM deduplicated_metrics
  WHERE measurement_date >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY user_id
  HAVING COUNT(DISTINCT measurement_date) >= 5
)
SELECT 
  cp.user_id,
  p.username,
  p.full_name,
  p.avatar_url,
  COALESCE(ums.active_days, 0) as active_days,
  COALESCE(ums.avg_recovery, 0) as avg_recovery,
  COALESCE(ums.avg_strain, 0) as avg_strain,
  COALESCE(ums.avg_sleep, 0) as avg_sleep,
  COALESCE(ums.avg_sleep_efficiency, 0) as avg_sleep_efficiency,
  COALESCE(ums.avg_resting_hr, 0) as avg_resting_hr,
  COALESCE(ums.avg_hrv, 0) as avg_hrv,
  COALESCE(ums.total_steps, 0) as total_steps,
  COALESCE(ums.total_active_calories, 0) as total_active_calories,
  COALESCE(ums.last_activity_date, cp.joined_at::date) as last_activity_date,
  COALESCE(sc.streak_days, 0) as streak_days,
  (
    COALESCE(ums.active_days * 5, 0) +
    COALESCE(CASE WHEN ums.avg_recovery > 66 THEN ums.active_days * 10 ELSE 0 END, 0) +
    COALESCE(CASE WHEN ums.avg_strain >= 15 THEN ums.active_days * 25 WHEN ums.avg_strain >= 10 THEN ums.active_days * 15 ELSE 0 END, 0) +
    COALESCE(CASE WHEN ums.avg_sleep >= 7 THEN ums.active_days * 10 ELSE 0 END, 0) +
    COALESCE(CASE WHEN ums.avg_sleep_efficiency >= 85 THEN ums.active_days * 15 ELSE 0 END, 0) +
    COALESCE(CASE WHEN sc.streak_days >= 30 THEN 200 WHEN sc.streak_days >= 14 THEN 100 WHEN sc.streak_days >= 7 THEN 50 ELSE 0 END, 0) +
    COALESCE(CASE WHEN ums.active_days >= 20 THEN 100 ELSE 0 END, 0)
  ) as total_points,
  cp.challenge_id
FROM challenge_participants cp
JOIN profiles p ON p.user_id = cp.user_id
JOIN active_challenges ac ON ac.id = cp.challenge_id
LEFT JOIN user_metrics_summary ums ON ums.user_id = cp.user_id
LEFT JOIN streak_calculation sc ON sc.user_id = cp.user_id
ORDER BY total_points DESC;