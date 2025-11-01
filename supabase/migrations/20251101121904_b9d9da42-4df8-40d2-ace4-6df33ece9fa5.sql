-- Drop existing leaderboard views
DROP VIEW IF EXISTS challenge_leaderboard_v2 CASCADE;
DROP VIEW IF EXISTS challenge_leaderboard_week CASCADE;
DROP VIEW IF EXISTS challenge_leaderboard_month CASCADE;

-- Create helper function for calculating streak days
CREATE OR REPLACE FUNCTION calculate_streak_days(p_user_id UUID, p_end_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
  v_streak INTEGER := 0;
  v_current_date DATE := p_end_date;
  v_has_data BOOLEAN;
BEGIN
  LOOP
    -- Check if user has any metrics for current date
    SELECT EXISTS(
      SELECT 1 FROM unified_metrics
      WHERE user_id = p_user_id 
      AND measurement_date = v_current_date
    ) INTO v_has_data;
    
    EXIT WHEN NOT v_has_data;
    
    v_streak := v_streak + 1;
    v_current_date := v_current_date - INTERVAL '1 day';
  END LOOP;
  
  RETURN v_streak;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create overall leaderboard view (all time)
CREATE VIEW challenge_leaderboard_v2 AS
WITH deduplicated_metrics AS (
  SELECT DISTINCT ON (user_id, metric_name, measurement_date)
    user_id,
    metric_name,
    value,
    measurement_date,
    priority,
    created_at
  FROM unified_metrics
  ORDER BY user_id, metric_name, measurement_date, priority DESC, created_at DESC
),
user_metrics_agg AS (
  SELECT
    cp.user_id,
    cp.challenge_id,
    -- Steps metrics
    SUM(CASE WHEN dm.metric_name = 'Steps' THEN dm.value ELSE 0 END) as total_steps,
    COALESCE(AVG(CASE WHEN dm.metric_name = 'Steps' AND dm.measurement_date >= CURRENT_DATE - INTERVAL '7 days' THEN dm.value END), 0) as steps_last_7d,
    
    -- Calories metrics
    SUM(CASE WHEN dm.metric_name = 'Active Calories' THEN dm.value ELSE 0 END) as total_calories,
    
    -- Workout metrics
    AVG(CASE WHEN dm.metric_name = 'Workout Strain' THEN dm.value END) as avg_strain,
    COALESCE(AVG(CASE WHEN dm.metric_name = 'Workout Strain' AND dm.measurement_date >= CURRENT_DATE - INTERVAL '7 days' THEN dm.value END), 0) as avg_strain_last_7d,
    COUNT(DISTINCT CASE WHEN dm.metric_name = 'Workout Strain' THEN dm.measurement_date END) as total_workouts,
    COUNT(DISTINCT CASE WHEN dm.metric_name = 'Workout Strain' AND dm.measurement_date >= CURRENT_DATE - INTERVAL '7 days' THEN dm.measurement_date END) as workouts_last_7d,
    
    -- Sleep metrics
    AVG(CASE WHEN dm.metric_name = 'Sleep Duration' THEN dm.value END) as avg_sleep,
    AVG(CASE WHEN dm.metric_name = 'Sleep Efficiency' THEN dm.value END) as avg_sleep_efficiency,
    COALESCE(AVG(CASE WHEN dm.metric_name = 'Sleep Duration' AND dm.measurement_date >= CURRENT_DATE - INTERVAL '7 days' THEN dm.value END), 0) as avg_sleep_last_7d,
    
    -- Recovery metrics
    AVG(CASE WHEN dm.metric_name = 'Recovery Score' THEN dm.value END) as avg_recovery,
    COALESCE(AVG(CASE WHEN dm.metric_name = 'Recovery Score' AND dm.measurement_date >= CURRENT_DATE - INTERVAL '7 days' THEN dm.value END), 0) as avg_recovery_last_7d,
    
    -- Heart metrics
    AVG(CASE WHEN dm.metric_name = 'HRV' THEN dm.value END) as avg_hrv,
    AVG(CASE WHEN dm.metric_name = 'Resting Heart Rate' THEN dm.value END) as avg_resting_hr,
    
    -- Body composition
    (SELECT value FROM deduplicated_metrics dm2 WHERE dm2.user_id = cp.user_id AND dm2.metric_name = 'Weight' ORDER BY measurement_date DESC LIMIT 1) as latest_weight,
    (SELECT value FROM deduplicated_metrics dm2 WHERE dm2.user_id = cp.user_id AND dm2.metric_name = 'Body Fat Percentage' ORDER BY measurement_date DESC LIMIT 1) as latest_body_fat,
    
    -- Activity tracking
    COUNT(DISTINCT dm.measurement_date) as days_with_data,
    MAX(dm.measurement_date) as last_activity_date,
    
    -- Weekly consistency (days with data in last 7 days / 7)
    COUNT(DISTINCT CASE WHEN dm.measurement_date >= CURRENT_DATE - INTERVAL '7 days' THEN dm.measurement_date END)::float / 7.0 as weekly_consistency
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
  COALESCE(points.points, 0) as total_points,
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
  calculate_streak_days(uma.user_id, CURRENT_DATE) as streak_days
FROM user_metrics_agg uma
LEFT JOIN profiles p ON p.id = uma.user_id
LEFT JOIN challenge_points points ON points.user_id = uma.user_id AND points.challenge_id = uma.challenge_id
ORDER BY total_points DESC;

-- Create weekly leaderboard view (last 7 days)
CREATE VIEW challenge_leaderboard_week AS
WITH deduplicated_metrics AS (
  SELECT DISTINCT ON (user_id, metric_name, measurement_date)
    user_id,
    metric_name,
    value,
    measurement_date,
    priority,
    created_at
  FROM unified_metrics
  WHERE measurement_date >= CURRENT_DATE - INTERVAL '7 days'
  ORDER BY user_id, metric_name, measurement_date, priority DESC, created_at DESC
),
user_metrics_agg AS (
  SELECT
    cp.user_id,
    cp.challenge_id,
    SUM(CASE WHEN dm.metric_name = 'Steps' THEN dm.value ELSE 0 END) as total_steps,
    AVG(CASE WHEN dm.metric_name = 'Steps' THEN dm.value END) as steps_last_7d,
    SUM(CASE WHEN dm.metric_name = 'Active Calories' THEN dm.value ELSE 0 END) as total_calories,
    AVG(CASE WHEN dm.metric_name = 'Workout Strain' THEN dm.value END) as avg_strain,
    AVG(CASE WHEN dm.metric_name = 'Workout Strain' THEN dm.value END) as avg_strain_last_7d,
    COUNT(DISTINCT CASE WHEN dm.metric_name = 'Workout Strain' THEN dm.measurement_date END) as total_workouts,
    COUNT(DISTINCT CASE WHEN dm.metric_name = 'Workout Strain' THEN dm.measurement_date END) as workouts_last_7d,
    AVG(CASE WHEN dm.metric_name = 'Sleep Duration' THEN dm.value END) as avg_sleep,
    AVG(CASE WHEN dm.metric_name = 'Sleep Efficiency' THEN dm.value END) as avg_sleep_efficiency,
    AVG(CASE WHEN dm.metric_name = 'Sleep Duration' THEN dm.value END) as avg_sleep_last_7d,
    AVG(CASE WHEN dm.metric_name = 'Recovery Score' THEN dm.value END) as avg_recovery,
    AVG(CASE WHEN dm.metric_name = 'Recovery Score' THEN dm.value END) as avg_recovery_last_7d,
    AVG(CASE WHEN dm.metric_name = 'HRV' THEN dm.value END) as avg_hrv,
    AVG(CASE WHEN dm.metric_name = 'Resting Heart Rate' THEN dm.value END) as avg_resting_hr,
    (SELECT value FROM unified_metrics dm2 WHERE dm2.user_id = cp.user_id AND dm2.metric_name = 'Weight' ORDER BY measurement_date DESC, priority DESC LIMIT 1) as latest_weight,
    (SELECT value FROM unified_metrics dm2 WHERE dm2.user_id = cp.user_id AND dm2.metric_name = 'Body Fat Percentage' ORDER BY measurement_date DESC, priority DESC LIMIT 1) as latest_body_fat,
    COUNT(DISTINCT dm.measurement_date) as days_with_data,
    COUNT(DISTINCT dm.measurement_date) as active_days,
    MAX(dm.measurement_date) as last_activity_date,
    COUNT(DISTINCT dm.measurement_date)::float / 7.0 as weekly_consistency
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
  COALESCE(points.points, 0) as total_points,
  uma.total_steps,
  uma.steps_last_7d,
  uma.total_calories,
  uma.total_calories as total_active_calories,
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
  calculate_streak_days(uma.user_id, CURRENT_DATE) as streak_days
FROM user_metrics_agg uma
LEFT JOIN profiles p ON p.id = uma.user_id
LEFT JOIN challenge_points points ON points.user_id = uma.user_id AND points.challenge_id = uma.challenge_id
ORDER BY total_points DESC;

-- Create monthly leaderboard view (last 30 days)
CREATE VIEW challenge_leaderboard_month AS
WITH deduplicated_metrics AS (
  SELECT DISTINCT ON (user_id, metric_name, measurement_date)
    user_id,
    metric_name,
    value,
    measurement_date,
    priority,
    created_at
  FROM unified_metrics
  WHERE measurement_date >= CURRENT_DATE - INTERVAL '30 days'
  ORDER BY user_id, metric_name, measurement_date, priority DESC, created_at DESC
),
user_metrics_agg AS (
  SELECT
    cp.user_id,
    cp.challenge_id,
    SUM(CASE WHEN dm.metric_name = 'Steps' THEN dm.value ELSE 0 END) as total_steps,
    COALESCE(AVG(CASE WHEN dm.metric_name = 'Steps' AND dm.measurement_date >= CURRENT_DATE - INTERVAL '7 days' THEN dm.value END), 0) as steps_last_7d,
    SUM(CASE WHEN dm.metric_name = 'Active Calories' THEN dm.value ELSE 0 END) as total_calories,
    AVG(CASE WHEN dm.metric_name = 'Workout Strain' THEN dm.value END) as avg_strain,
    COALESCE(AVG(CASE WHEN dm.metric_name = 'Workout Strain' AND dm.measurement_date >= CURRENT_DATE - INTERVAL '7 days' THEN dm.value END), 0) as avg_strain_last_7d,
    COUNT(DISTINCT CASE WHEN dm.metric_name = 'Workout Strain' THEN dm.measurement_date END) as total_workouts,
    COUNT(DISTINCT CASE WHEN dm.metric_name = 'Workout Strain' AND dm.measurement_date >= CURRENT_DATE - INTERVAL '7 days' THEN dm.measurement_date END) as workouts_last_7d,
    AVG(CASE WHEN dm.metric_name = 'Sleep Duration' THEN dm.value END) as avg_sleep,
    AVG(CASE WHEN dm.metric_name = 'Sleep Efficiency' THEN dm.value END) as avg_sleep_efficiency,
    COALESCE(AVG(CASE WHEN dm.metric_name = 'Sleep Duration' AND dm.measurement_date >= CURRENT_DATE - INTERVAL '7 days' THEN dm.value END), 0) as avg_sleep_last_7d,
    AVG(CASE WHEN dm.metric_name = 'Recovery Score' THEN dm.value END) as avg_recovery,
    COALESCE(AVG(CASE WHEN dm.metric_name = 'Recovery Score' AND dm.measurement_date >= CURRENT_DATE - INTERVAL '7 days' THEN dm.value END), 0) as avg_recovery_last_7d,
    AVG(CASE WHEN dm.metric_name = 'HRV' THEN dm.value END) as avg_hrv,
    AVG(CASE WHEN dm.metric_name = 'Resting Heart Rate' THEN dm.value END) as avg_resting_hr,
    (SELECT value FROM unified_metrics dm2 WHERE dm2.user_id = cp.user_id AND dm2.metric_name = 'Weight' ORDER BY measurement_date DESC, priority DESC LIMIT 1) as latest_weight,
    (SELECT value FROM unified_metrics dm2 WHERE dm2.user_id = cp.user_id AND dm2.metric_name = 'Body Fat Percentage' ORDER BY measurement_date DESC, priority DESC LIMIT 1) as latest_body_fat,
    COUNT(DISTINCT dm.measurement_date) as days_with_data,
    COUNT(DISTINCT dm.measurement_date) as active_days,
    MAX(dm.measurement_date) as last_activity_date,
    COUNT(DISTINCT CASE WHEN dm.measurement_date >= CURRENT_DATE - INTERVAL '7 days' THEN dm.measurement_date END)::float / 7.0 as weekly_consistency
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
  COALESCE(points.points, 0) as total_points,
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
  calculate_streak_days(uma.user_id, CURRENT_DATE) as streak_days
FROM user_metrics_agg uma
LEFT JOIN profiles p ON p.id = uma.user_id
LEFT JOIN challenge_points points ON points.user_id = uma.user_id AND points.challenge_id = uma.challenge_id
ORDER BY total_points DESC;