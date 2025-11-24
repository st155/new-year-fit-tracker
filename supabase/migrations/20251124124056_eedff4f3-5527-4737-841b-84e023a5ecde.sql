-- Преобразование Security Definer Views в Security Definer Functions
-- Этот подход решает проблему с linter и добавляет явные проверки прав доступа

-- ==============================================================================
-- 1. ПУБЛИЧНЫЕ ФУНКЦИИ (доступны аутентифицированным пользователям для своих данных)
-- ==============================================================================

-- 1.1 activity_summary_view → get_activity_summary
CREATE OR REPLACE FUNCTION public.get_activity_summary(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  user_id uuid,
  date date,
  total_steps integer,
  total_calories integer,
  total_distance_km numeric,
  total_exercise_minutes integer,
  avg_heart_rate integer,
  sleep_hours numeric,
  recovery_score integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Проверка аутентификации
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Проверка прав: пользователь или его тренер
  IF p_user_id != auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM trainer_clients 
      WHERE trainer_id = auth.uid() 
        AND client_id = p_user_id 
        AND active = true
    ) THEN
      RAISE EXCEPTION 'Access denied';
    END IF;
  END IF;
  
  -- Возврат данных
  RETURN QUERY
  SELECT 
    dhs.user_id,
    dhs.date,
    dhs.steps,
    (COALESCE(dhs.active_calories, 0) + COALESCE(dhs.resting_calories, 0))::INTEGER as total_calories,
    dhs.distance_km,
    dhs.exercise_minutes,
    dhs.heart_rate_avg,
    dhs.sleep_hours,
    (SELECT value::INTEGER FROM unified_metrics um 
     WHERE um.user_id = dhs.user_id 
       AND um.measurement_date = dhs.date 
       AND um.metric_name = 'Recovery Score' 
     ORDER BY priority DESC LIMIT 1) as recovery_score
  FROM daily_health_summary dhs
  WHERE dhs.user_id = p_user_id
  ORDER BY dhs.date DESC;
END;
$$;

-- 1.2 body_composition_view → get_body_composition
CREATE OR REPLACE FUNCTION public.get_body_composition(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  user_id uuid,
  measurement_date date,
  weight numeric,
  body_fat_percentage numeric,
  muscle_mass numeric,
  bmi numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF p_user_id != auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM trainer_clients 
      WHERE trainer_id = auth.uid() AND client_id = p_user_id AND active = true
    ) THEN
      RAISE EXCEPTION 'Access denied';
    END IF;
  END IF;
  
  RETURN QUERY
  SELECT 
    bc.user_id,
    bc.measurement_date::DATE,
    bc.weight,
    bc.body_fat_percentage,
    bc.muscle_mass,
    (bc.weight / ((p.height / 100.0) ^ 2)) as bmi
  FROM body_composition bc
  JOIN profiles p ON p.user_id = bc.user_id
  WHERE bc.user_id = p_user_id
  ORDER BY bc.measurement_date DESC;
END;
$$;

-- 1.3 recovery_metrics_view → get_recovery_metrics
CREATE OR REPLACE FUNCTION public.get_recovery_metrics(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  user_id uuid,
  measurement_date date,
  recovery_score numeric,
  hrv numeric,
  resting_heart_rate numeric,
  sleep_hours numeric,
  sleep_efficiency numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF p_user_id != auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM trainer_clients 
      WHERE trainer_id = auth.uid() AND client_id = p_user_id AND active = true
    ) THEN
      RAISE EXCEPTION 'Access denied';
    END IF;
  END IF;
  
  RETURN QUERY
  SELECT 
    um.user_id,
    um.measurement_date,
    MAX(CASE WHEN um.metric_name = 'Recovery Score' THEN um.value END) as recovery_score,
    MAX(CASE WHEN um.metric_name = 'HRV' THEN um.value END) as hrv,
    MAX(CASE WHEN um.metric_name = 'Resting Heart Rate' THEN um.value END) as resting_heart_rate,
    MAX(CASE WHEN um.metric_name = 'Sleep Duration' THEN um.value END) as sleep_hours,
    MAX(CASE WHEN um.metric_name = 'Sleep Efficiency' THEN um.value END) as sleep_efficiency
  FROM unified_metrics um
  WHERE um.user_id = p_user_id
    AND um.metric_name IN ('Recovery Score', 'HRV', 'Resting Heart Rate', 'Sleep Duration', 'Sleep Efficiency')
  GROUP BY um.user_id, um.measurement_date
  ORDER BY um.measurement_date DESC;
END;
$$;

-- 1.4 sleep_analysis_view → get_sleep_analysis
CREATE OR REPLACE FUNCTION public.get_sleep_analysis(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  user_id uuid,
  measurement_date date,
  sleep_duration numeric,
  deep_sleep numeric,
  rem_sleep numeric,
  light_sleep numeric,
  awake_time numeric,
  sleep_efficiency numeric,
  sleep_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF p_user_id != auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM trainer_clients 
      WHERE trainer_id = auth.uid() AND client_id = p_user_id AND active = true
    ) THEN
      RAISE EXCEPTION 'Access denied';
    END IF;
  END IF;
  
  RETURN QUERY
  SELECT 
    um.user_id,
    um.measurement_date,
    MAX(CASE WHEN um.metric_name = 'Sleep Duration' THEN um.value END) as sleep_duration,
    MAX(CASE WHEN um.metric_name = 'Deep Sleep Duration' THEN um.value END) as deep_sleep,
    MAX(CASE WHEN um.metric_name = 'REM Sleep Duration' THEN um.value END) as rem_sleep,
    MAX(CASE WHEN um.metric_name = 'Light Sleep Duration' THEN um.value END) as light_sleep,
    MAX(CASE WHEN um.metric_name = 'Awake Duration' THEN um.value END) as awake_time,
    MAX(CASE WHEN um.metric_name = 'Sleep Efficiency' THEN um.value END) as sleep_efficiency,
    MAX(CASE WHEN um.metric_name = 'Sleep Score' THEN um.value END) as sleep_score
  FROM unified_metrics um
  WHERE um.user_id = p_user_id
    AND um.metric_name IN ('Sleep Duration', 'Deep Sleep Duration', 'REM Sleep Duration', 
                           'Light Sleep Duration', 'Awake Duration', 'Sleep Efficiency', 'Sleep Score')
  GROUP BY um.user_id, um.measurement_date
  ORDER BY um.measurement_date DESC;
END;
$$;

-- 1.5 habit_analytics → get_habit_analytics (уже есть view, добавим функцию)
CREATE OR REPLACE FUNCTION public.get_habit_analytics(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  id uuid,
  user_id uuid,
  name text,
  habit_type text,
  current_streak integer,
  longest_streak integer,
  total_completions bigint,
  completion_rate numeric,
  last_completed_at timestamp with time zone,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF p_user_id != auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM trainer_clients 
      WHERE trainer_id = auth.uid() AND client_id = p_user_id AND active = true
    ) THEN
      RAISE EXCEPTION 'Access denied';
    END IF;
  END IF;
  
  RETURN QUERY
  SELECT * FROM habit_analytics ha WHERE ha.user_id = p_user_id;
END;
$$;

-- ==============================================================================
-- 2. LEADERBOARD ФУНКЦИИ (доступны участникам челленджей)
-- ==============================================================================

-- 2.1 Универсальная функция для leaderboard с временными периодами
CREATE OR REPLACE FUNCTION public.get_challenge_leaderboard(
  p_challenge_id uuid DEFAULT NULL,
  p_time_period text DEFAULT 'overall', -- 'overall', 'week', 'month'
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  user_id uuid,
  challenge_id uuid,
  username text,
  full_name text,
  avatar_url text,
  total_points integer,
  streak_days integer,
  active_days bigint,
  days_with_data bigint,
  last_activity_date date,
  total_steps numeric,
  steps_last_7d numeric,
  total_calories numeric,
  avg_strain numeric,
  avg_strain_last_7d numeric,
  total_workouts bigint,
  workouts_last_7d bigint,
  avg_sleep numeric,
  avg_sleep_efficiency numeric,
  avg_sleep_last_7d numeric,
  avg_recovery numeric,
  avg_recovery_last_7d numeric,
  avg_hrv numeric,
  avg_resting_hr numeric,
  latest_weight numeric,
  latest_body_fat numeric,
  weekly_consistency numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  view_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Проверка доступа к челленджу
  IF p_challenge_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM challenge_participants cp
      WHERE cp.challenge_id = p_challenge_id AND cp.user_id = auth.uid()
    ) AND NOT EXISTS (
      SELECT 1 FROM challenge_trainers ct
      WHERE ct.challenge_id = p_challenge_id AND ct.trainer_id = auth.uid()
    ) AND NOT EXISTS (
      SELECT 1 FROM challenges c
      WHERE c.id = p_challenge_id AND c.created_by = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Access denied to this challenge';
    END IF;
  END IF;
  
  -- Выбор view на основе периода
  view_name := CASE p_time_period
    WHEN 'week' THEN 'challenge_leaderboard_week'
    WHEN 'month' THEN 'challenge_leaderboard_month'
    ELSE 'challenge_leaderboard_v2'
  END;
  
  -- Возврат данных
  RETURN QUERY EXECUTE format('
    SELECT * FROM %I lb
    WHERE ($1 IS NULL OR lb.challenge_id = $1)
      AND public.can_view_profile($2, lb.user_id)
    ORDER BY lb.total_points DESC NULLS LAST
    LIMIT $3
  ', view_name) USING p_challenge_id, auth.uid(), p_limit;
END;
$$;

-- ==============================================================================
-- 3. TRAINER ФУНКЦИИ (только для тренеров)
-- ==============================================================================

-- 3.1 client_health_scores → get_client_health_scores
CREATE OR REPLACE FUNCTION public.get_client_health_scores(p_trainer_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  client_id uuid,
  health_score integer,
  recovery_score numeric,
  sleep_quality numeric,
  activity_level numeric,
  consistency_score numeric,
  last_updated timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Только сам тренер может видеть своих клиентов
  IF p_trainer_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT * FROM client_health_scores chs 
  WHERE chs.client_id IN (
    SELECT tc.client_id FROM trainer_clients tc 
    WHERE tc.trainer_id = p_trainer_id AND tc.active = true
  );
END;
$$;

-- 3.2 client_unified_metrics → get_client_unified_metrics
CREATE OR REPLACE FUNCTION public.get_client_unified_metrics(
  p_trainer_id uuid DEFAULT auth.uid(),
  p_client_id uuid DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  metric_name text,
  metric_category text,
  value numeric,
  unit text,
  measurement_date date,
  source text,
  confidence_score integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF p_trainer_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    cum.user_id,
    cum.metric_name,
    cum.metric_category,
    cum.value,
    cum.unit,
    cum.measurement_date,
    cum.source,
    cum.confidence_score
  FROM client_unified_metrics cum
  WHERE cum.user_id IN (
    SELECT tc.client_id FROM trainer_clients tc 
    WHERE tc.trainer_id = p_trainer_id AND tc.active = true
  )
  AND (p_client_id IS NULL OR cum.user_id = p_client_id)
  AND (p_start_date IS NULL OR cum.measurement_date >= p_start_date)
  AND (p_end_date IS NULL OR cum.measurement_date <= p_end_date);
END;
$$;

-- 3.3 trainer_client_summary → get_trainer_client_summary
CREATE OR REPLACE FUNCTION public.get_trainer_client_summary(p_trainer_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  trainer_id uuid,
  client_id uuid,
  client_name text,
  total_metrics bigint,
  latest_metric_date date,
  avg_recovery numeric,
  avg_sleep numeric,
  total_workouts bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF p_trainer_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT * FROM trainer_client_summary tcs 
  WHERE tcs.trainer_id = p_trainer_id;
END;
$$;

-- ==============================================================================
-- 4. ADMIN ФУНКЦИИ (только для администраторов)
-- ==============================================================================

-- Вспомогательная функция для проверки админа
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = p_user_id AND role = 'admin'
  );
$$;

-- 4.1 data_quality_trends → get_data_quality_trends
CREATE OR REPLACE FUNCTION public.get_data_quality_trends()
RETURNS TABLE (
  date date,
  total_metrics bigint,
  avg_confidence numeric,
  high_quality_count bigint,
  medium_quality_count bigint,
  low_quality_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  RETURN QUERY
  SELECT * FROM data_quality_trends ORDER BY date DESC LIMIT 30;
END;
$$;

-- 4.2 edge_function_performance → get_edge_function_performance
CREATE OR REPLACE FUNCTION public.get_edge_function_performance()
RETURNS TABLE (
  function_name text,
  total_calls bigint,
  avg_duration_ms numeric,
  error_count bigint,
  success_rate numeric,
  last_called_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  RETURN QUERY
  SELECT * FROM edge_function_performance;
END;
$$;

-- 4.3 job_processing_stats → get_job_processing_stats
CREATE OR REPLACE FUNCTION public.get_job_processing_stats()
RETURNS TABLE (
  date date,
  total_jobs bigint,
  completed_jobs bigint,
  failed_jobs bigint,
  avg_processing_time_ms numeric,
  success_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  RETURN QUERY
  SELECT * FROM job_processing_stats ORDER BY date DESC LIMIT 30;
END;
$$;

-- 4.4 webhook_processing_stats → get_webhook_processing_stats
CREATE OR REPLACE FUNCTION public.get_webhook_processing_stats()
RETURNS TABLE (
  provider text,
  total_webhooks bigint,
  processed_count bigint,
  failed_count bigint,
  avg_processing_time_ms numeric,
  success_rate numeric,
  last_received_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  RETURN QUERY
  SELECT * FROM webhook_processing_stats;
END;
$$;

-- ==============================================================================
-- 5. УДАЛЕНИЕ СТАРЫХ VIEWS (кроме материализованных и используемых внутренне)
-- ==============================================================================

-- Удаляем только обычные views, оставляем материализованные и служебные
DROP VIEW IF EXISTS public.activity_summary_view CASCADE;
DROP VIEW IF EXISTS public.body_composition_view CASCADE;
DROP VIEW IF EXISTS public.recovery_metrics_view CASCADE;
DROP VIEW IF EXISTS public.sleep_analysis_view CASCADE;

-- Leaderboard views оставляем для внутреннего использования функцией get_challenge_leaderboard
-- но удаляем прямой доступ через RLS
REVOKE ALL ON public.challenge_leaderboard_v2 FROM authenticated, anon;
REVOKE ALL ON public.challenge_leaderboard_week FROM authenticated, anon;
REVOKE ALL ON public.challenge_leaderboard_month FROM authenticated, anon;

-- Trainer views
REVOKE ALL ON public.client_health_scores FROM authenticated, anon;
REVOKE ALL ON public.client_unified_metrics FROM authenticated, anon;
REVOKE ALL ON public.trainer_client_summary FROM authenticated, anon;

-- Admin views
REVOKE ALL ON public.data_quality_trends FROM authenticated, anon;
REVOKE ALL ON public.edge_function_performance FROM authenticated, anon;
REVOKE ALL ON public.job_processing_stats FROM authenticated, anon;
REVOKE ALL ON public.webhook_processing_stats FROM authenticated, anon;

-- Оставляем views но ограничиваем доступ только для service_role
GRANT SELECT ON public.challenge_leaderboard_v2 TO service_role;
GRANT SELECT ON public.challenge_leaderboard_week TO service_role;
GRANT SELECT ON public.challenge_leaderboard_month TO service_role;
GRANT SELECT ON public.client_health_scores TO service_role;
GRANT SELECT ON public.client_unified_metrics TO service_role;
GRANT SELECT ON public.trainer_client_summary TO service_role;
GRANT SELECT ON public.data_quality_trends TO service_role;
GRANT SELECT ON public.edge_function_performance TO service_role;
GRANT SELECT ON public.job_processing_stats TO service_role;
GRANT SELECT ON public.webhook_processing_stats TO service_role;

-- ==============================================================================
-- 6. ПРАВА ДОСТУПА К ФУНКЦИЯМ
-- ==============================================================================

-- Публичные функции доступны всем аутентифицированным
GRANT EXECUTE ON FUNCTION public.get_activity_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_body_composition TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_recovery_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sleep_analysis TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_habit_analytics TO authenticated;

-- Leaderboard доступен всем аутентифицированным
GRANT EXECUTE ON FUNCTION public.get_challenge_leaderboard TO authenticated;

-- Trainer функции доступны всем аутентифицированным (проверка внутри)
GRANT EXECUTE ON FUNCTION public.get_client_health_scores TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_unified_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trainer_client_summary TO authenticated;

-- Admin функции доступны всем аутентифицированным (проверка внутри)
GRANT EXECUTE ON FUNCTION public.get_data_quality_trends TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_edge_function_performance TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_job_processing_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_webhook_processing_stats TO authenticated;

-- Вспомогательная функция
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;

COMMENT ON FUNCTION public.get_activity_summary IS 'Получить сводку активности пользователя';
COMMENT ON FUNCTION public.get_challenge_leaderboard IS 'Получить leaderboard челленджа с проверкой доступа';
COMMENT ON FUNCTION public.get_client_health_scores IS 'Получить health scores клиентов тренера';
COMMENT ON FUNCTION public.get_data_quality_trends IS 'Получить тренды качества данных (только админы)';