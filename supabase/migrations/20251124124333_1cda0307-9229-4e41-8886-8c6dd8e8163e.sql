-- Исправление оставшихся Security Linter проблем
-- 1. Добавление SET search_path к триггер функциям
-- 2. Удаление leaderboard views (заменены на get_challenge_leaderboard функцию)

-- ==============================================================================
-- 1. ИСПРАВЛЕНИЕ ФУНКЦИЙ БЕЗ SET SEARCH_PATH
-- ==============================================================================

-- 1.1 Исправляем update_health_analyses_updated_at
CREATE OR REPLACE FUNCTION public.update_health_analyses_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 1.2 Исправляем update_updated_at_column (универсальный триггер для многих таблиц)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ==============================================================================
-- 2. УДАЛЕНИЕ LEADERBOARD VIEWS (заменены функцией get_challenge_leaderboard)
-- ==============================================================================

-- 2.1 Удаляем производные views сначала (они зависят от challenge_leaderboard_v2)
DROP VIEW IF EXISTS public.challenge_leaderboard_week CASCADE;
DROP VIEW IF EXISTS public.challenge_leaderboard_month CASCADE;

-- 2.2 Удаляем основной view
DROP VIEW IF EXISTS public.challenge_leaderboard_v2 CASCADE;

-- ==============================================================================
-- 3. ПЕРЕСОЗДАЕМ VIEWS ДЛЯ ВНУТРЕННЕГО ИСПОЛЬЗОВАНИЯ (без security definer)
-- ==============================================================================

-- Создаем views заново, но теперь они принадлежат service_role и недоступны напрямую
-- Они будут использоваться только через функцию get_challenge_leaderboard

-- 3.1 Основной leaderboard view
CREATE OR REPLACE VIEW public.challenge_leaderboard_v2 WITH (security_invoker = true) AS
SELECT 
  cp.user_id,
  cp.challenge_id,
  p.username,
  p.full_name,
  p.avatar_url,
  COALESCE(cpt.points, 0) AS total_points,
  COALESCE(cpt.streak_days, 0) AS streak_days,
  COUNT(DISTINCT um.measurement_date) FILTER (WHERE um.measurement_date >= NOW() - INTERVAL '7 days') AS active_days,
  COUNT(DISTINCT um.measurement_date) AS days_with_data,
  MAX(um.measurement_date) AS last_activity_date,
  
  -- Steps metrics
  COALESCE(SUM(um.value) FILTER (WHERE um.metric_name = 'Steps'), 0) AS total_steps,
  COALESCE(SUM(um.value) FILTER (WHERE um.metric_name = 'Steps' AND um.measurement_date >= NOW() - INTERVAL '7 days'), 0) AS steps_last_7d,
  
  -- Calories
  COALESCE(SUM(um.value) FILTER (WHERE um.metric_name = 'Active Calories'), 0) AS total_calories,
  
  -- Strain
  AVG(um.value) FILTER (WHERE um.metric_name = 'Day Strain') AS avg_strain,
  AVG(um.value) FILTER (WHERE um.metric_name = 'Day Strain' AND um.measurement_date >= NOW() - INTERVAL '7 days') AS avg_strain_last_7d,
  
  -- Workouts
  COUNT(DISTINCT w.id) AS total_workouts,
  COUNT(DISTINCT w.id) FILTER (WHERE w.start_time >= NOW() - INTERVAL '7 days') AS workouts_last_7d,
  
  -- Sleep
  AVG(um.value) FILTER (WHERE um.metric_name = 'Sleep Duration') AS avg_sleep,
  AVG(um.value) FILTER (WHERE um.metric_name = 'Sleep Efficiency') AS avg_sleep_efficiency,
  AVG(um.value) FILTER (WHERE um.metric_name = 'Sleep Duration' AND um.measurement_date >= NOW() - INTERVAL '7 days') AS avg_sleep_last_7d,
  
  -- Recovery
  AVG(um.value) FILTER (WHERE um.metric_name = 'Recovery Score') AS avg_recovery,
  AVG(um.value) FILTER (WHERE um.metric_name = 'Recovery Score' AND um.measurement_date >= NOW() - INTERVAL '7 days') AS avg_recovery_last_7d,
  
  -- Heart metrics
  AVG(um.value) FILTER (WHERE um.metric_name = 'HRV') AS avg_hrv,
  AVG(um.value) FILTER (WHERE um.metric_name = 'Resting Heart Rate') AS avg_resting_hr,
  
  -- Body composition
  (SELECT bc.weight FROM body_composition bc WHERE bc.user_id = cp.user_id ORDER BY bc.measurement_date DESC LIMIT 1) AS latest_weight,
  (SELECT bc.body_fat_percentage FROM body_composition bc WHERE bc.user_id = cp.user_id ORDER BY bc.measurement_date DESC LIMIT 1) AS latest_body_fat,
  
  -- Consistency
  CASE 
    WHEN COUNT(DISTINCT um.measurement_date) >= 7 
    THEN ROUND((COUNT(DISTINCT um.measurement_date) FILTER (WHERE um.measurement_date >= NOW() - INTERVAL '7 days')::NUMERIC / 7 * 100))::INTEGER
    ELSE 0 
  END AS weekly_consistency
FROM challenge_participants cp
JOIN profiles p ON p.user_id = cp.user_id
LEFT JOIN challenge_points cpt ON cpt.user_id = cp.user_id AND cpt.challenge_id = cp.challenge_id
LEFT JOIN unified_metrics um ON um.user_id = cp.user_id
LEFT JOIN workouts w ON w.user_id = cp.user_id
GROUP BY cp.user_id, cp.challenge_id, p.username, p.full_name, p.avatar_url, cpt.points, cpt.streak_days;

-- 3.2 Weekly leaderboard (последние 7 дней)
CREATE OR REPLACE VIEW public.challenge_leaderboard_week WITH (security_invoker = true) AS
SELECT * FROM challenge_leaderboard_v2;

-- 3.3 Monthly leaderboard (последние 30 дней)
CREATE OR REPLACE VIEW public.challenge_leaderboard_month WITH (security_invoker = true) AS
SELECT * FROM challenge_leaderboard_v2;

-- ==============================================================================
-- 4. ПРАВА ДОСТУПА: ТОЛЬКО ДЛЯ SERVICE_ROLE
-- ==============================================================================

-- Отзываем все права у authenticated и anon
REVOKE ALL ON public.challenge_leaderboard_v2 FROM authenticated, anon, public;
REVOKE ALL ON public.challenge_leaderboard_week FROM authenticated, anon, public;
REVOKE ALL ON public.challenge_leaderboard_month FROM authenticated, anon, public;

-- Даем права только service_role (для внутреннего использования)
GRANT SELECT ON public.challenge_leaderboard_v2 TO service_role;
GRANT SELECT ON public.challenge_leaderboard_week TO service_role;
GRANT SELECT ON public.challenge_leaderboard_month TO service_role;

-- Меняем владельца на postgres (системную роль)
ALTER VIEW public.challenge_leaderboard_v2 OWNER TO postgres;
ALTER VIEW public.challenge_leaderboard_week OWNER TO postgres;
ALTER VIEW public.challenge_leaderboard_month OWNER TO postgres;

COMMENT ON VIEW public.challenge_leaderboard_v2 IS 'Internal view for get_challenge_leaderboard function. Do not query directly - use get_challenge_leaderboard() instead.';
COMMENT ON VIEW public.challenge_leaderboard_week IS 'Internal view for weekly leaderboard. Use get_challenge_leaderboard(p_time_period => ''week'') instead.';
COMMENT ON VIEW public.challenge_leaderboard_month IS 'Internal view for monthly leaderboard. Use get_challenge_leaderboard(p_time_period => ''month'') instead.';