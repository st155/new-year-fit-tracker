-- Create weekly leaderboard view (current week: Monday to today)
CREATE OR REPLACE VIEW challenge_leaderboard_week AS
WITH current_week_metrics AS (
  SELECT 
    um.user_id,
    um.metric_name,
    um.value,
    um.measurement_date
  FROM unified_metrics um
  WHERE um.measurement_date >= date_trunc('week', CURRENT_DATE)
    AND um.measurement_date <= CURRENT_DATE
),
weekly_stats AS (
  SELECT 
    m.user_id,
    -- Basic activity metrics
    COUNT(DISTINCT m.measurement_date) as active_days,
    MAX(m.measurement_date) as last_activity_date,
    
    -- Steps
    COALESCE(SUM(CASE WHEN m.metric_name = 'Steps' THEN m.value END), 0) as total_steps,
    
    -- Calories
    COALESCE(SUM(CASE WHEN m.metric_name = 'Active Calories' THEN m.value END), 0) as total_calories,
    
    -- Workouts
    COUNT(DISTINCT CASE WHEN m.metric_name = 'Strain' AND m.value > 10 THEN m.measurement_date END) as total_workouts,
    
    -- Averages
    AVG(CASE WHEN m.metric_name = 'Strain' THEN m.value END) as avg_strain,
    AVG(CASE WHEN m.metric_name = 'Sleep Duration' THEN m.value END) as avg_sleep,
    AVG(CASE WHEN m.metric_name = 'Sleep Efficiency' THEN m.value END) as avg_sleep_efficiency,
    AVG(CASE WHEN m.metric_name = 'Recovery Score' THEN m.value END) as avg_recovery,
    AVG(CASE WHEN m.metric_name = 'Resting Heart Rate' THEN m.value END) as avg_resting_hr,
    AVG(CASE WHEN m.metric_name = 'HRV' THEN m.value END) as avg_hrv
  FROM current_week_metrics m
  GROUP BY m.user_id
),
weekly_points_calc AS (
  SELECT 
    ws.user_id,
    -- Calculate weekly points based on activity
    (
      COALESCE(ws.active_days * 10, 0) + -- 10 points per active day
      COALESCE((ws.total_steps / 1000)::integer * 2, 0) + -- 2 points per 1000 steps
      COALESCE(ws.total_workouts * 25, 0) + -- 25 points per workout
      COALESCE((ws.avg_recovery / 10)::integer * 5, 0) + -- Recovery bonus
      COALESCE((ws.avg_sleep / 2)::integer * 5, 0) -- Sleep bonus
    )::integer as total_points
  FROM weekly_stats ws
)
SELECT 
  ws.user_id,
  NULL::uuid as challenge_id,
  p.username,
  p.full_name,
  p.avatar_url,
  COALESCE(wpc.total_points, 0) as total_points,
  ws.active_days,
  ws.last_activity_date,
  0 as streak_days,
  ws.total_steps,
  ws.total_calories,
  0 as total_active_calories,
  ws.total_workouts,
  ws.avg_strain,
  ws.avg_sleep,
  ws.avg_sleep_efficiency,
  ws.avg_recovery,
  ws.avg_resting_hr,
  ws.avg_hrv,
  ws.total_steps as steps_last_7d,
  ws.avg_strain as avg_strain_last_7d,
  ws.avg_sleep as avg_sleep_last_7d,
  ws.avg_recovery as avg_recovery_last_7d,
  ws.total_workouts as workouts_last_7d,
  CASE 
    WHEN ws.active_days > 0 THEN (ws.active_days::float / GREATEST(EXTRACT(DOW FROM CURRENT_DATE), 1)) * 100
    ELSE 0 
  END as weekly_consistency,
  NULL::numeric as latest_weight,
  NULL::numeric as latest_body_fat,
  0::bigint as days_with_data
FROM weekly_stats ws
LEFT JOIN profiles p ON p.id = ws.user_id
LEFT JOIN weekly_points_calc wpc ON wpc.user_id = ws.user_id
WHERE ws.active_days > 0;

-- Create monthly leaderboard view (current month: 1st to today)
CREATE OR REPLACE VIEW challenge_leaderboard_month AS
WITH current_month_metrics AS (
  SELECT 
    um.user_id,
    um.metric_name,
    um.value,
    um.measurement_date
  FROM unified_metrics um
  WHERE um.measurement_date >= date_trunc('month', CURRENT_DATE)
    AND um.measurement_date <= CURRENT_DATE
),
monthly_stats AS (
  SELECT 
    m.user_id,
    -- Basic activity metrics
    COUNT(DISTINCT m.measurement_date) as active_days,
    MAX(m.measurement_date) as last_activity_date,
    
    -- Steps
    COALESCE(SUM(CASE WHEN m.metric_name = 'Steps' THEN m.value END), 0) as total_steps,
    
    -- Calories
    COALESCE(SUM(CASE WHEN m.metric_name = 'Active Calories' THEN m.value END), 0) as total_calories,
    
    -- Workouts
    COUNT(DISTINCT CASE WHEN m.metric_name = 'Strain' AND m.value > 10 THEN m.measurement_date END) as total_workouts,
    
    -- Averages
    AVG(CASE WHEN m.metric_name = 'Strain' THEN m.value END) as avg_strain,
    AVG(CASE WHEN m.metric_name = 'Sleep Duration' THEN m.value END) as avg_sleep,
    AVG(CASE WHEN m.metric_name = 'Sleep Efficiency' THEN m.value END) as avg_sleep_efficiency,
    AVG(CASE WHEN m.metric_name = 'Recovery Score' THEN m.value END) as avg_recovery,
    AVG(CASE WHEN m.metric_name = 'Resting Heart Rate' THEN m.value END) as avg_resting_hr,
    AVG(CASE WHEN m.metric_name = 'HRV' THEN m.value END) as avg_hrv,
    
    -- Last 7 days for monthly view
    SUM(CASE WHEN m.measurement_date >= CURRENT_DATE - INTERVAL '7 days' AND m.metric_name = 'Steps' THEN m.value END) as steps_last_7d,
    AVG(CASE WHEN m.measurement_date >= CURRENT_DATE - INTERVAL '7 days' AND m.metric_name = 'Strain' THEN m.value END) as avg_strain_last_7d,
    AVG(CASE WHEN m.measurement_date >= CURRENT_DATE - INTERVAL '7 days' AND m.metric_name = 'Sleep Duration' THEN m.value END) as avg_sleep_last_7d,
    AVG(CASE WHEN m.measurement_date >= CURRENT_DATE - INTERVAL '7 days' AND m.metric_name = 'Recovery Score' THEN m.value END) as avg_recovery_last_7d,
    COUNT(DISTINCT CASE WHEN m.measurement_date >= CURRENT_DATE - INTERVAL '7 days' AND m.metric_name = 'Strain' AND m.value > 10 THEN m.measurement_date END) as workouts_last_7d
  FROM current_month_metrics m
  GROUP BY m.user_id
),
monthly_points_calc AS (
  SELECT 
    ms.user_id,
    -- Calculate monthly points based on activity
    (
      COALESCE(ms.active_days * 10, 0) + -- 10 points per active day
      COALESCE((ms.total_steps / 1000)::integer * 2, 0) + -- 2 points per 1000 steps
      COALESCE(ms.total_workouts * 25, 0) + -- 25 points per workout
      COALESCE((ms.avg_recovery / 10)::integer * 5, 0) + -- Recovery bonus
      COALESCE((ms.avg_sleep / 2)::integer * 5, 0) -- Sleep bonus
    )::integer as total_points
  FROM monthly_stats ms
)
SELECT 
  ms.user_id,
  NULL::uuid as challenge_id,
  p.username,
  p.full_name,
  p.avatar_url,
  COALESCE(mpc.total_points, 0) as total_points,
  ms.active_days,
  ms.last_activity_date,
  0 as streak_days,
  ms.total_steps,
  ms.total_calories,
  0 as total_active_calories,
  ms.total_workouts,
  ms.avg_strain,
  ms.avg_sleep,
  ms.avg_sleep_efficiency,
  ms.avg_recovery,
  ms.avg_resting_hr,
  ms.avg_hrv,
  ms.steps_last_7d,
  ms.avg_strain_last_7d,
  ms.avg_sleep_last_7d,
  ms.avg_recovery_last_7d,
  ms.workouts_last_7d,
  CASE 
    WHEN ms.active_days > 0 THEN (ms.active_days::float / EXTRACT(DAY FROM CURRENT_DATE)) * 100
    ELSE 0 
  END as weekly_consistency,
  NULL::numeric as latest_weight,
  NULL::numeric as latest_body_fat,
  ms.active_days as days_with_data
FROM monthly_stats ms
LEFT JOIN profiles p ON p.id = ms.user_id
LEFT JOIN monthly_points_calc mpc ON mpc.user_id = ms.user_id
WHERE ms.active_days > 0;