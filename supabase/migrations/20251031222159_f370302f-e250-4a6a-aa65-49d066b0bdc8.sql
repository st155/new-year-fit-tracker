-- Drop existing view
DROP VIEW IF EXISTS challenge_leaderboard_v2;

-- Recreate view with simple date math
CREATE VIEW challenge_leaderboard_v2 AS
WITH user_metrics AS (
  SELECT 
    cp.user_id,
    cp.challenge_id,
    um.measurement_date,
    um.metric_name,
    um.value,
    ROW_NUMBER() OVER (
      PARTITION BY cp.user_id, um.metric_name, um.measurement_date 
      ORDER BY um.created_at DESC
    ) as rn
  FROM challenge_participants cp
  LEFT JOIN unified_metrics um ON um.user_id = cp.user_id
  WHERE um.measurement_date BETWEEN 
    (SELECT start_date FROM challenges WHERE id = cp.challenge_id) 
    AND 
    (SELECT end_date FROM challenges WHERE id = cp.challenge_id)
),
latest_metrics AS (
  SELECT * FROM user_metrics WHERE rn = 1
),
aggregated_metrics AS (
  SELECT
    challenge_id,
    user_id,
    SUM(CASE WHEN metric_name = 'Steps' THEN value ELSE 0 END) as total_steps,
    SUM(CASE WHEN metric_name = 'Active Calories' THEN value ELSE 0 END) as total_calories,
    COUNT(DISTINCT CASE WHEN metric_name IN ('Workout Strain', 'Steps', 'Active Calories') THEN measurement_date END) as total_workouts,
    AVG(CASE WHEN metric_name = 'Workout Strain' THEN value END) as avg_strain,
    AVG(CASE WHEN metric_name = 'Sleep Duration' THEN value END) as avg_sleep,
    AVG(CASE WHEN metric_name = 'Sleep Efficiency' THEN value END) as avg_sleep_efficiency,
    AVG(CASE WHEN metric_name = 'HRV' THEN value END) as avg_hrv,
    AVG(CASE WHEN metric_name = 'Resting Heart Rate' THEN value END) as avg_resting_hr,
    AVG(CASE WHEN metric_name = 'Recovery Score' THEN value END) as avg_recovery,
    MAX(measurement_date) as last_activity_date,
    COUNT(DISTINCT measurement_date) as days_with_data
  FROM latest_metrics
  GROUP BY challenge_id, user_id
),
last_7_days_metrics AS (
  SELECT
    challenge_id,
    user_id,
    SUM(CASE WHEN metric_name = 'Steps' THEN value ELSE 0 END) as steps_last_7d,
    COUNT(DISTINCT CASE WHEN metric_name IN ('Workout Strain', 'Steps', 'Active Calories') THEN measurement_date END) as workouts_last_7d,
    AVG(CASE WHEN metric_name = 'Workout Strain' THEN value END) as avg_strain_last_7d,
    AVG(CASE WHEN metric_name = 'Recovery Score' THEN value END) as avg_recovery_last_7d,
    AVG(CASE WHEN metric_name = 'Sleep Duration' THEN value END) as avg_sleep_last_7d
  FROM latest_metrics
  WHERE measurement_date >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY challenge_id, user_id
),
streak_dates AS (
  SELECT DISTINCT user_id, challenge_id, measurement_date
  FROM latest_metrics
  WHERE measurement_date <= CURRENT_DATE
),
streak_groups AS (
  SELECT
    user_id,
    challenge_id,
    measurement_date,
    measurement_date - (ROW_NUMBER() OVER (PARTITION BY user_id, challenge_id ORDER BY measurement_date))::integer AS streak_group
  FROM streak_dates
),
streak_calc AS (
  SELECT
    user_id,
    challenge_id,
    MAX(streak_count) as streak_days
  FROM (
    SELECT
      user_id,
      challenge_id,
      streak_group,
      COUNT(*) as streak_count,
      MAX(measurement_date) as last_date
    FROM streak_groups
    GROUP BY user_id, challenge_id, streak_group
    HAVING MAX(measurement_date) = CURRENT_DATE OR MAX(measurement_date) = CURRENT_DATE - 1
  ) streaks
  GROUP BY user_id, challenge_id
),
weekly_consistency AS (
  SELECT
    lm.user_id,
    lm.challenge_id,
    COUNT(DISTINCT lm.measurement_date)::float / NULLIF(
      GREATEST(1, (CURRENT_DATE - c.start_date))
    , 0) as weekly_consistency
  FROM latest_metrics lm
  JOIN challenges c ON c.id = lm.challenge_id
  WHERE lm.measurement_date >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY lm.user_id, lm.challenge_id, c.start_date
),
latest_body_comp AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    weight as latest_weight,
    body_fat_percentage as latest_body_fat
  FROM body_composition
  ORDER BY user_id, measurement_date DESC
)
SELECT
  am.challenge_id,
  am.user_id,
  p.username,
  p.full_name,
  p.avatar_url,
  COALESCE(cp.points, 0) as total_points,
  am.total_steps,
  am.total_calories,
  am.total_workouts,
  am.avg_strain,
  am.avg_sleep,
  am.avg_sleep_efficiency,
  am.avg_hrv,
  am.avg_resting_hr,
  am.avg_recovery,
  am.last_activity_date,
  am.days_with_data,
  l7d.steps_last_7d,
  l7d.workouts_last_7d,
  l7d.avg_strain_last_7d,
  l7d.avg_recovery_last_7d,
  l7d.avg_sleep_last_7d,
  COALESCE(sc.streak_days, 0) as streak_days,
  COALESCE(wc.weekly_consistency, 0) as weekly_consistency,
  lbc.latest_weight,
  lbc.latest_body_fat
FROM aggregated_metrics am
LEFT JOIN challenge_points cp ON cp.user_id = am.user_id AND cp.challenge_id = am.challenge_id
LEFT JOIN profiles p ON p.id = am.user_id
LEFT JOIN last_7_days_metrics l7d ON l7d.user_id = am.user_id AND l7d.challenge_id = am.challenge_id
LEFT JOIN streak_calc sc ON sc.user_id = am.user_id AND sc.challenge_id = am.challenge_id
LEFT JOIN weekly_consistency wc ON wc.user_id = am.user_id AND wc.challenge_id = am.challenge_id
LEFT JOIN latest_body_comp lbc ON lbc.user_id = am.user_id;