-- Improve leaderboard scoring formula to reflect real activity and training intensity
-- New formula accounts for: steps, calories, strain, recovery, active days, and streaks

DROP VIEW IF EXISTS challenge_leaderboard_v2;

CREATE VIEW challenge_leaderboard_v2 AS
WITH user_activity AS (
  SELECT 
    um.user_id,
    COUNT(DISTINCT um.measurement_date) as active_days,
    -- Activity volume metrics
    SUM(CASE WHEN um.metric_name = 'steps' THEN um.value ELSE 0 END) as total_steps,
    SUM(CASE WHEN um.metric_name = 'active_calories' THEN um.value ELSE 0 END) as total_active_calories,
    -- Quality metrics (averages)
    AVG(CASE WHEN um.metric_name = 'recovery_score' THEN um.value ELSE NULL END) as avg_recovery,
    AVG(CASE WHEN um.metric_name = 'strain' THEN um.value ELSE NULL END) as avg_strain,
    AVG(CASE WHEN um.metric_name = 'sleep_duration' THEN um.value ELSE NULL END) as avg_sleep,
    AVG(CASE WHEN um.metric_name = 'sleep_efficiency' THEN um.value ELSE NULL END) as avg_sleep_efficiency,
    AVG(CASE WHEN um.metric_name = 'resting_heart_rate' THEN um.value ELSE NULL END) as avg_resting_hr,
    AVG(CASE WHEN um.metric_name = 'hrv' THEN um.value ELSE NULL END) as avg_hrv,
    MAX(um.measurement_date) as last_activity_date
  FROM unified_metrics um
  WHERE um.measurement_date >= CURRENT_DATE - INTERVAL '28 days'
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
      measurement_date - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY measurement_date))::INTEGER AS group_id
    FROM (
      SELECT DISTINCT user_id, measurement_date
      FROM unified_metrics
      WHERE measurement_date >= CURRENT_DATE - INTERVAL '28 days'
        AND measurement_date < CURRENT_DATE
      ORDER BY user_id, measurement_date DESC
    ) daily_activity
  ) grouped_dates
  WHERE measurement_date >= CURRENT_DATE - (
    SELECT MAX(measurement_date) - MIN(measurement_date)
    FROM (
      SELECT DISTINCT measurement_date
      FROM unified_metrics
      WHERE user_id = grouped_dates.user_id
        AND measurement_date >= CURRENT_DATE - INTERVAL '28 days'
        AND measurement_date < CURRENT_DATE
      ORDER BY measurement_date DESC
      LIMIT (
        SELECT COUNT(DISTINCT d)::INTEGER
        FROM generate_series(
          CURRENT_DATE - INTERVAL '28 days',
          CURRENT_DATE - INTERVAL '1 day',
          '1 day'::INTERVAL
        ) d
      )
    ) recent
  )
  GROUP BY user_id, group_id
  ORDER BY user_id, streak_days DESC
),
max_streaks AS (
  SELECT 
    user_id,
    MAX(streak_days) as streak_days
  FROM streak_calculation
  GROUP BY user_id
)
SELECT 
  gen_random_uuid() as id,
  cp.challenge_id,
  cp.user_id,
  p.username,
  p.full_name,
  p.avatar_url,
  -- NEW COMPREHENSIVE SCORING FORMULA
  -- Base points: active days (10 pts each) + streak bonus (5 pts each)
  -- Volume points: steps (1 pt per 1000 steps) + calories (1 pt per 100 cal)
  -- Quality points: strain intensity (20 pts per unit) + recovery (2 pts per unit)
  (
    COALESCE(ua.active_days, 0) * 10 +                    -- Base: active days
    COALESCE(sc.streak_days, 0) * 5 +                     -- Bonus: consistency streak
    (COALESCE(ua.total_steps, 0) / 1000) +                -- Volume: steps
    (COALESCE(ua.total_active_calories, 0) / 100) +       -- Volume: calories burned
    (COALESCE(ua.avg_strain, 0) * 20) +                   -- Quality: training intensity
    (COALESCE(ua.avg_recovery, 0) * 2)                    -- Quality: recovery score
  )::BIGINT as total_points,
  COALESCE(ua.active_days, 0) as active_days,
  COALESCE(sc.streak_days, 0) as streak_days,
  ua.last_activity_date,
  -- Detailed metrics for display
  ua.avg_recovery,
  ua.avg_strain,
  ua.avg_sleep,
  ua.avg_sleep_efficiency,
  ua.avg_resting_hr,
  ua.avg_hrv,
  ua.total_steps,
  ua.total_active_calories
FROM challenge_participants cp
LEFT JOIN profiles p ON p.id = cp.user_id
LEFT JOIN user_activity ua ON ua.user_id = cp.user_id
LEFT JOIN max_streaks sc ON sc.user_id = cp.user_id
WHERE cp.challenge_id IS NOT NULL;