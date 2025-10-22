-- Исправление Security Definer View проблемы
-- Пересоздаем view с SECURITY INVOKER для использования прав вызывающего пользователя

DROP VIEW IF EXISTS public.trainer_client_summary;

CREATE OR REPLACE VIEW public.trainer_client_summary 
WITH (security_invoker = true) AS
SELECT 
  tc.trainer_id,
  tc.client_id,
  p.username,
  p.full_name,
  p.avatar_url,
  count(DISTINCT g.id) FILTER (WHERE (g.is_personal = true)) AS active_goals_count,
  count(DISTINCT m.id) FILTER (WHERE (m.measurement_date >= (CURRENT_DATE - '7 days'::interval))) AS recent_measurements_count,
  max(m.measurement_date) AS last_activity_date,
  jsonb_build_object(
    'whoop_recovery_avg', (
      SELECT (avg(mv.value))::numeric(10,2) AS avg
      FROM metric_values mv
      JOIN user_metrics um ON (um.id = mv.metric_id)
      WHERE um.user_id = tc.client_id 
        AND um.metric_name = 'Recovery Score'
        AND um.source = 'whoop'
        AND mv.measurement_date >= (CURRENT_DATE - '7 days'::interval)
    ),
    'sleep_hours_avg', (
      SELECT (avg(mv.value))::numeric(10,2) AS avg
      FROM metric_values mv
      JOIN user_metrics um ON (um.id = mv.metric_id)
      WHERE um.user_id = tc.client_id 
        AND um.metric_name = 'Sleep Duration'
        AND mv.measurement_date >= (CURRENT_DATE - '7 days'::interval)
    ),
    'weight_latest', (
      SELECT mv.value
      FROM metric_values mv
      JOIN user_metrics um ON (um.id = mv.metric_id)
      WHERE um.user_id = tc.client_id 
        AND um.metric_name = 'Weight'
      ORDER BY mv.measurement_date DESC
      LIMIT 1
    ),
    'vo2max_latest', (
      SELECT mv.value
      FROM metric_values mv
      JOIN user_metrics um ON (um.id = mv.metric_id)
      WHERE um.user_id = tc.client_id 
        AND um.metric_name = ANY (ARRAY['VO2 Max', 'VO2Max'])
      ORDER BY mv.measurement_date DESC
      LIMIT 1
    )
  ) AS health_summary
FROM trainer_clients tc
JOIN profiles p ON (p.user_id = tc.client_id)
LEFT JOIN goals g ON (g.user_id = tc.client_id)
LEFT JOIN measurements m ON (m.user_id = tc.client_id)
WHERE tc.active = true
GROUP BY tc.trainer_id, tc.client_id, p.username, p.full_name, p.avatar_url;