-- Fix challenge_leaderboard_v2 VIEW with correct JOIN and add 7-day metrics
DROP VIEW IF EXISTS challenge_leaderboard_v2;

CREATE VIEW challenge_leaderboard_v2 AS
WITH active_participants AS (
  SELECT DISTINCT
    cp.challenge_id,
    cp.user_id,
    cp.id as participant_id
  FROM challenge_participants cp
  INNER JOIN challenges c ON c.id = cp.challenge_id
  WHERE c.is_active = true
),
metrics_summary AS (
  SELECT 
    um.user_id,
    SUM(CASE WHEN um.metric_name = 'Steps' THEN um.value ELSE 0 END) as total_steps,
    SUM(CASE WHEN um.metric_name = 'Active Energy' THEN um.value ELSE 0 END) as total_active_calories,
    AVG(CASE WHEN um.metric_name = 'Day Strain' THEN um.value ELSE NULL END) as avg_strain,
    AVG(CASE WHEN um.metric_name = 'Recovery Score' THEN um.value ELSE NULL END) as avg_recovery,
    AVG(CASE WHEN um.metric_name = 'Sleep Duration' THEN um.value ELSE NULL END) as avg_sleep,
    AVG(CASE WHEN um.metric_name = 'Sleep Efficiency' THEN um.value ELSE NULL END) as avg_sleep_efficiency,
    AVG(CASE WHEN um.metric_name = 'Resting Heart Rate' THEN um.value ELSE NULL END) as avg_resting_hr,
    AVG(CASE WHEN um.metric_name = 'HRV' THEN um.value ELSE NULL END) as avg_hrv,
    COUNT(DISTINCT um.measurement_date) as active_days,
    MAX(um.measurement_date) as last_activity_date
  FROM unified_metrics um
  INNER JOIN active_participants ap ON ap.user_id = um.user_id
  GROUP BY um.user_id
),
weekly_metrics AS (
  SELECT 
    um.user_id,
    SUM(CASE WHEN um.metric_name = 'Steps' THEN um.value ELSE 0 END) as steps_last_7d,
    AVG(CASE WHEN um.metric_name = 'Day Strain' THEN um.value ELSE NULL END) as avg_strain_last_7d,
    AVG(CASE WHEN um.metric_name = 'Sleep Duration' THEN um.value ELSE NULL END) as avg_sleep_last_7d,
    AVG(CASE WHEN um.metric_name = 'Recovery Score' THEN um.value ELSE NULL END) as avg_recovery_last_7d,
    COUNT(DISTINCT CASE WHEN um.metric_name = 'Day Strain' AND um.value > 10 THEN um.measurement_date END) as workouts_last_7d,
    (COUNT(DISTINCT um.measurement_date)::FLOAT / 7 * 100) as weekly_consistency
  FROM unified_metrics um
  INNER JOIN active_participants ap ON ap.user_id = um.user_id
  WHERE um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'
    AND um.measurement_date < CURRENT_DATE
  GROUP BY um.user_id
),
streak_calculation AS (
  SELECT
    user_id,
    COUNT(*) as streak_days
  FROM (
    SELECT 
      user_id,
      measurement_date,
      measurement_date - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY measurement_date))::INTEGER as streak_group
    FROM (
      SELECT DISTINCT um.user_id, um.measurement_date
      FROM unified_metrics um
      INNER JOIN active_participants ap ON ap.user_id = um.user_id
      WHERE um.measurement_date >= CURRENT_DATE - INTERVAL '30 days'
    ) distinct_dates
  ) grouped_dates
  WHERE measurement_date <= CURRENT_DATE - INTERVAL '1 day'
  GROUP BY user_id, streak_group
  ORDER BY user_id, MAX(measurement_date) DESC
),
latest_streaks AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    streak_days
  FROM streak_calculation
  ORDER BY user_id, streak_days DESC
),
points_data AS (
  SELECT
    cp.user_id,
    cp.challenge_id,
    COALESCE(chp.points, 0) as total_points
  FROM challenge_participants cp
  LEFT JOIN challenge_points chp ON chp.user_id = cp.user_id AND chp.challenge_id = cp.challenge_id
)
SELECT 
  ap.participant_id as id,
  ap.user_id,
  ap.challenge_id,
  p.username,
  p.full_name,
  p.avatar_url,
  COALESCE(pd.total_points, 0) as total_points,
  COALESCE(ms.total_steps, 0) as total_steps,
  COALESCE(ms.total_active_calories, 0) as total_active_calories,
  ms.avg_strain,
  ms.avg_recovery,
  ms.avg_sleep,
  ms.avg_sleep_efficiency,
  ms.avg_resting_hr,
  ms.avg_hrv,
  COALESCE(ms.active_days, 0) as active_days,
  ms.last_activity_date,
  COALESCE(ls.streak_days, 0) as streak_days,
  COALESCE(wm.steps_last_7d, 0) as steps_last_7d,
  wm.avg_strain_last_7d,
  wm.avg_sleep_last_7d,
  wm.avg_recovery_last_7d,
  COALESCE(wm.workouts_last_7d, 0) as workouts_last_7d,
  COALESCE(wm.weekly_consistency, 0) as weekly_consistency
FROM active_participants ap
LEFT JOIN profiles p ON p.user_id = ap.user_id
LEFT JOIN metrics_summary ms ON ms.user_id = ap.user_id
LEFT JOIN weekly_metrics wm ON wm.user_id = ap.user_id
LEFT JOIN latest_streaks ls ON ls.user_id = ap.user_id
LEFT JOIN points_data pd ON pd.user_id = ap.user_id AND pd.challenge_id = ap.challenge_id
ORDER BY pd.total_points DESC NULLS LAST, ms.active_days DESC NULLS LAST;