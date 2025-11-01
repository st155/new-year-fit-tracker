-- ============================================================================
-- FIX REMAINING SECURITY DEFINER VIEWS - CORRECTED VERSION
-- Convert all old views to WITH (security_invoker=on)
-- ============================================================================

-- Challenge Leaderboard Month
DROP VIEW IF EXISTS challenge_leaderboard_month CASCADE;
CREATE OR REPLACE VIEW challenge_leaderboard_month
WITH (security_invoker=on) AS
SELECT 
  cp.challenge_id,
  cp.user_id,
  p.username,
  p.full_name,
  p.avatar_url,
  COALESCE(chp.points, 0) as total_points,
  COALESCE(SUM(CASE WHEN um.metric_name = 'Steps' THEN um.value END), 0) as total_steps,
  COALESCE(AVG(CASE WHEN um.metric_name = 'Steps' AND um.measurement_date >= CURRENT_DATE - 7 THEN um.value END), 0) as steps_last_7d,
  COALESCE(SUM(CASE WHEN um.metric_name = 'Active Calories' THEN um.value END), 0) as total_calories,
  COALESCE(AVG(CASE WHEN um.metric_name = 'Day Strain' THEN um.value END), 0) as avg_strain,
  COALESCE(AVG(CASE WHEN um.metric_name = 'Day Strain' AND um.measurement_date >= CURRENT_DATE - 7 THEN um.value END), 0) as avg_strain_last_7d,
  COUNT(DISTINCT w.id) as total_workouts,
  COUNT(DISTINCT CASE WHEN w.start_time >= CURRENT_TIMESTAMP - INTERVAL '7 days' THEN w.id END) as workouts_last_7d,
  COALESCE(AVG(CASE WHEN um.metric_name = 'Sleep Duration' THEN um.value END), 0) as avg_sleep,
  COALESCE(AVG(CASE WHEN um.metric_name = 'Sleep Efficiency' THEN um.value END), 0) as avg_sleep_efficiency,
  COALESCE(AVG(CASE WHEN um.metric_name = 'Sleep Duration' AND um.measurement_date >= CURRENT_DATE - 7 THEN um.value END), 0) as avg_sleep_last_7d,
  COALESCE(AVG(CASE WHEN um.metric_name = 'Recovery Score' THEN um.value END), 0) as avg_recovery,
  COALESCE(AVG(CASE WHEN um.metric_name = 'Recovery Score' AND um.measurement_date >= CURRENT_DATE - 7 THEN um.value END), 0) as avg_recovery_last_7d,
  COALESCE(AVG(CASE WHEN um.metric_name = 'HRV RMSSD' THEN um.value END), 0) as avg_hrv,
  COALESCE(AVG(CASE WHEN um.metric_name = 'Resting Heart Rate' THEN um.value END), 0) as avg_resting_hr,
  (SELECT bc.weight FROM body_composition bc WHERE bc.user_id = cp.user_id ORDER BY bc.measurement_date DESC LIMIT 1) as latest_weight,
  (SELECT bc.body_fat_percentage FROM body_composition bc WHERE bc.user_id = cp.user_id ORDER BY bc.measurement_date DESC LIMIT 1) as latest_body_fat,
  COUNT(DISTINCT um.measurement_date) as days_with_data,
  COUNT(DISTINCT CASE WHEN um.measurement_date >= CURRENT_DATE - 7 THEN um.measurement_date END) as active_days,
  calculate_streak_days(cp.user_id, CURRENT_DATE) as streak_days,
  CASE 
    WHEN COUNT(DISTINCT um.measurement_date) > 0 
    THEN ROUND((COUNT(DISTINCT CASE WHEN um.measurement_date >= CURRENT_DATE - 7 THEN um.measurement_date END)::NUMERIC / 7.0) * 100, 1)
    ELSE 0 
  END as weekly_consistency,
  MAX(um.measurement_date) as last_activity_date
FROM challenge_participants cp
JOIN profiles p ON p.user_id = cp.user_id
LEFT JOIN challenge_points chp ON chp.user_id = cp.user_id AND chp.challenge_id = cp.challenge_id
LEFT JOIN unified_metrics um ON um.user_id = cp.user_id
LEFT JOIN workouts w ON w.user_id = cp.user_id
GROUP BY cp.challenge_id, cp.user_id, p.username, p.full_name, p.avatar_url, chp.points;

-- Challenge Leaderboard V2
DROP VIEW IF EXISTS challenge_leaderboard_v2 CASCADE;
CREATE OR REPLACE VIEW challenge_leaderboard_v2
WITH (security_invoker=on) AS
SELECT * FROM challenge_leaderboard_month;

-- Challenge Leaderboard Week
DROP VIEW IF EXISTS challenge_leaderboard_week CASCADE;
CREATE OR REPLACE VIEW challenge_leaderboard_week
WITH (security_invoker=on) AS
SELECT 
  cp.challenge_id,
  cp.user_id,
  p.username,
  p.full_name,
  p.avatar_url,
  COALESCE(chp.points, 0) as total_points,
  COALESCE(SUM(CASE WHEN um.metric_name = 'Steps' AND um.measurement_date >= CURRENT_DATE - 7 THEN um.value END), 0) as steps_last_7d,
  COALESCE(SUM(CASE WHEN um.metric_name = 'Steps' THEN um.value END), 0) as total_steps,
  COALESCE(SUM(CASE WHEN um.metric_name = 'Active Calories' THEN um.value END), 0) as total_calories,
  COALESCE(SUM(CASE WHEN um.metric_name = 'Active Calories' AND um.measurement_date >= CURRENT_DATE - 7 THEN um.value END), 0) as total_active_calories,
  COALESCE(AVG(CASE WHEN um.metric_name = 'Day Strain' THEN um.value END), 0) as avg_strain,
  COALESCE(AVG(CASE WHEN um.metric_name = 'Day Strain' AND um.measurement_date >= CURRENT_DATE - 7 THEN um.value END), 0) as avg_strain_last_7d,
  COUNT(DISTINCT w.id) as total_workouts,
  COUNT(DISTINCT CASE WHEN w.start_time >= CURRENT_TIMESTAMP - INTERVAL '7 days' THEN w.id END) as workouts_last_7d,
  calculate_streak_days(cp.user_id, CURRENT_DATE) as streak_days,
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN um.measurement_date >= CURRENT_DATE - 7 THEN um.measurement_date END) > 0 
    THEN ROUND((COUNT(DISTINCT CASE WHEN um.measurement_date >= CURRENT_DATE - 7 THEN um.measurement_date END)::NUMERIC / 7.0) * 100, 1)
    ELSE 0 
  END as weekly_consistency,
  MAX(um.measurement_date) as last_activity_date,
  COUNT(DISTINCT um.measurement_date) as days_with_data,
  COUNT(DISTINCT CASE WHEN um.measurement_date >= CURRENT_DATE - 7 THEN um.measurement_date END) as active_days,
  COALESCE(AVG(CASE WHEN um.metric_name = 'Sleep Duration' THEN um.value END), 0) as avg_sleep,
  COALESCE(AVG(CASE WHEN um.metric_name = 'Sleep Efficiency' THEN um.value END), 0) as avg_sleep_efficiency,
  COALESCE(AVG(CASE WHEN um.metric_name = 'Sleep Duration' AND um.measurement_date >= CURRENT_DATE - 7 THEN um.value END), 0) as avg_sleep_last_7d,
  COALESCE(AVG(CASE WHEN um.metric_name = 'Recovery Score' THEN um.value END), 0) as avg_recovery,
  COALESCE(AVG(CASE WHEN um.metric_name = 'Recovery Score' AND um.measurement_date >= CURRENT_DATE - 7 THEN um.value END), 0) as avg_recovery_last_7d,
  COALESCE(AVG(CASE WHEN um.metric_name = 'HRV RMSSD' THEN um.value END), 0) as avg_hrv,
  COALESCE(AVG(CASE WHEN um.metric_name = 'Resting Heart Rate' THEN um.value END), 0) as avg_resting_hr,
  (SELECT bc.weight FROM body_composition bc WHERE bc.user_id = cp.user_id ORDER BY bc.measurement_date DESC LIMIT 1) as latest_weight,
  (SELECT bc.body_fat_percentage FROM body_composition bc WHERE bc.user_id = cp.user_id ORDER BY bc.measurement_date DESC LIMIT 1) as latest_body_fat
FROM challenge_participants cp
JOIN profiles p ON p.user_id = cp.user_id
LEFT JOIN challenge_points chp ON chp.user_id = cp.user_id AND chp.challenge_id = cp.challenge_id
LEFT JOIN unified_metrics um ON um.user_id = cp.user_id
LEFT JOIN workouts w ON w.user_id = cp.user_id
GROUP BY cp.challenge_id, cp.user_id, p.username, p.full_name, p.avatar_url, chp.points;

-- Challenge Progress
DROP VIEW IF EXISTS challenge_progress CASCADE;
CREATE OR REPLACE VIEW challenge_progress
WITH (security_invoker=on) AS
SELECT 
  cp.challenge_id,
  cp.user_id,
  g.id as goal_id,
  g.goal_name,
  g.goal_type,
  g.target_value,
  g.target_unit,
  cp.baseline_weight as baseline_value,
  cp.baseline_recorded_at,
  cp.baseline_source,
  (SELECT m.value 
   FROM measurements m 
   WHERE m.goal_id = g.id 
   ORDER BY m.measurement_date DESC 
   LIMIT 1) as current_value,
  CASE 
    WHEN g.target_value > 0 THEN 
      ROUND(((SELECT m.value FROM measurements m WHERE m.goal_id = g.id ORDER BY m.measurement_date DESC LIMIT 1) / g.target_value * 100)::NUMERIC, 1)
    ELSE 0 
  END as progress_percent
FROM challenge_participants cp
LEFT JOIN goals g ON g.user_id = cp.user_id
WHERE g.id IS NOT NULL;

-- Client Health Scores
DROP VIEW IF EXISTS client_health_scores CASCADE;
CREATE OR REPLACE VIEW client_health_scores
WITH (security_invoker=on) AS
SELECT 
  um.user_id,
  MAX(um.measurement_date) as last_measurement,
  AVG(CASE WHEN um.metric_name = 'Recovery Score' THEN um.value END) as recovery_score,
  AVG(CASE WHEN um.metric_name = 'Sleep Duration' THEN um.value END) as sleep_score,
  AVG(CASE WHEN um.metric_name = 'Steps' THEN um.value / 10000.0 * 100 END) as activity_score,
  CASE 
    WHEN COUNT(DISTINCT um.measurement_date) >= 7 THEN 100
    WHEN COUNT(DISTINCT um.measurement_date) >= 5 THEN 80
    WHEN COUNT(DISTINCT um.measurement_date) >= 3 THEN 60
    ELSE 40
  END as consistency_score,
  0 as trend_score,
  (
    COALESCE(AVG(CASE WHEN um.metric_name = 'Recovery Score' THEN um.value END), 0) * 0.3 +
    COALESCE(AVG(CASE WHEN um.metric_name = 'Sleep Duration' THEN um.value / 8.0 * 100 END), 0) * 0.2 +
    COALESCE(AVG(CASE WHEN um.metric_name = 'Steps' THEN um.value / 10000.0 * 100 END), 0) * 0.2 +
    CASE 
      WHEN COUNT(DISTINCT um.measurement_date) >= 7 THEN 100
      WHEN COUNT(DISTINCT um.measurement_date) >= 5 THEN 80
      WHEN COUNT(DISTINCT um.measurement_date) >= 3 THEN 60
      ELSE 40
    END * 0.3
  ) as total_health_score
FROM unified_metrics um
WHERE um.measurement_date >= CURRENT_DATE - 30
GROUP BY um.user_id;

-- Client Unified Metrics
DROP VIEW IF EXISTS client_unified_metrics CASCADE;
CREATE OR REPLACE VIEW client_unified_metrics
WITH (security_invoker=on) AS
SELECT * FROM unified_metrics WHERE deleted_at IS NULL;

-- Data Quality Trends
DROP VIEW IF EXISTS data_quality_trends CASCADE;
CREATE OR REPLACE VIEW data_quality_trends
WITH (security_invoker=on) AS
SELECT 
  user_id,
  measurement_date,
  AVG(quality_score) as avg_quality_score,
  COUNT(*) as metric_count,
  COUNT(DISTINCT source) as source_count
FROM unified_metrics
WHERE measurement_date >= CURRENT_DATE - 30
  AND deleted_at IS NULL
GROUP BY user_id, measurement_date;

-- Edge Function Performance
DROP VIEW IF EXISTS edge_function_performance CASCADE;
CREATE OR REPLACE VIEW edge_function_performance
WITH (security_invoker=on) AS
SELECT 
  type as function_type,
  COUNT(*) as total_executions,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds,
  MAX(created_at) as last_execution
FROM background_jobs
WHERE created_at >= CURRENT_DATE - 7
GROUP BY type;

-- Job Processing Stats
DROP VIEW IF EXISTS job_processing_stats CASCADE;
CREATE OR REPLACE VIEW job_processing_stats
WITH (security_invoker=on) AS
SELECT 
  type,
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration,
  MAX(created_at) as last_created
FROM background_jobs
WHERE created_at >= CURRENT_DATE - 7
GROUP BY type, status;

-- Trainer Client Summary
DROP VIEW IF EXISTS trainer_client_summary CASCADE;
CREATE OR REPLACE VIEW trainer_client_summary
WITH (security_invoker=on) AS
SELECT 
  tc.trainer_id,
  COUNT(DISTINCT tc.client_id) as total_clients,
  COUNT(DISTINCT CASE WHEN um.measurement_date >= CURRENT_DATE - 7 THEN tc.client_id END) as active_clients,
  AVG(
    COALESCE((SELECT value FROM unified_metrics WHERE user_id = tc.client_id AND metric_name = 'Recovery Score' ORDER BY measurement_date DESC LIMIT 1), 0)
  ) as avg_recovery_score
FROM trainer_clients tc
LEFT JOIN unified_metrics um ON um.user_id = tc.client_id
WHERE tc.active = true
GROUP BY tc.trainer_id;

-- Webhook Processing Stats
DROP VIEW IF EXISTS webhook_processing_stats CASCADE;
CREATE OR REPLACE VIEW webhook_processing_stats
WITH (security_invoker=on) AS
SELECT 
  provider,
  status,
  COUNT(*) as count,
  MAX(created_at) as last_received
FROM terra_webhooks_raw
WHERE created_at >= CURRENT_DATE - 7
GROUP BY provider, status;