-- Полное удаление leaderboard views и переписывание get_challenge_leaderboard с инлайн SQL
-- Это полностью устранит Security Definer View предупреждения

-- ==============================================================================
-- 1. УДАЛЕНИЕ ВСЕХ LEADERBOARD VIEWS
-- ==============================================================================

DROP VIEW IF EXISTS public.challenge_leaderboard_week CASCADE;
DROP VIEW IF EXISTS public.challenge_leaderboard_month CASCADE;
DROP VIEW IF EXISTS public.challenge_leaderboard_v2 CASCADE;

-- ==============================================================================
-- 2. ПЕРЕПИСЫВАЕМ ФУНКЦИЮ get_challenge_leaderboard С ИНЛАЙН SQL
-- ==============================================================================

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
  time_filter_days integer;
BEGIN
  -- Проверка аутентификации
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
  
  -- Определяем временной фильтр на основе периода
  time_filter_days := CASE p_time_period
    WHEN 'week' THEN 7
    WHEN 'month' THEN 30
    ELSE 365 -- для 'overall' берем год данных
  END;
  
  -- Возвращаем leaderboard данные с инлайн SQL
  RETURN QUERY
  SELECT 
    cp.user_id,
    cp.challenge_id,
    p.username,
    p.full_name,
    p.avatar_url,
    COALESCE(cpt.points, 0)::INTEGER AS total_points,
    COALESCE(cpt.streak_days, 0)::INTEGER AS streak_days,
    
    -- Активные дни (последние 7 дней)
    COUNT(DISTINCT um.measurement_date) FILTER (
      WHERE um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'
    ) AS active_days,
    
    -- Всего дней с данными (за выбранный период)
    COUNT(DISTINCT um.measurement_date) FILTER (
      WHERE um.measurement_date >= CURRENT_DATE - (time_filter_days || ' days')::INTERVAL
    ) AS days_with_data,
    
    -- Последняя активность
    MAX(um.measurement_date)::DATE AS last_activity_date,
    
    -- Steps metrics (за весь период)
    COALESCE(
      SUM(um.value) FILTER (
        WHERE um.metric_name = 'Steps' 
          AND um.measurement_date >= CURRENT_DATE - (time_filter_days || ' days')::INTERVAL
      ), 
      0
    ) AS total_steps,
    
    -- Steps за последние 7 дней
    COALESCE(
      SUM(um.value) FILTER (
        WHERE um.metric_name = 'Steps' 
          AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'
      ), 
      0
    ) AS steps_last_7d,
    
    -- Калории (за весь период)
    COALESCE(
      SUM(um.value) FILTER (
        WHERE um.metric_name = 'Active Calories'
          AND um.measurement_date >= CURRENT_DATE - (time_filter_days || ' days')::INTERVAL
      ), 
      0
    ) AS total_calories,
    
    -- Средний Strain (за весь период)
    AVG(um.value) FILTER (
      WHERE um.metric_name = 'Day Strain'
        AND um.measurement_date >= CURRENT_DATE - (time_filter_days || ' days')::INTERVAL
    ) AS avg_strain,
    
    -- Средний Strain за последние 7 дней
    AVG(um.value) FILTER (
      WHERE um.metric_name = 'Day Strain' 
        AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'
    ) AS avg_strain_last_7d,
    
    -- Workouts (за весь период)
    COUNT(DISTINCT w.id) FILTER (
      WHERE w.start_time >= CURRENT_DATE - (time_filter_days || ' days')::INTERVAL
    ) AS total_workouts,
    
    -- Workouts за последние 7 дней
    COUNT(DISTINCT w.id) FILTER (
      WHERE w.start_time >= CURRENT_DATE - INTERVAL '7 days'
    ) AS workouts_last_7d,
    
    -- Sleep metrics (за весь период)
    AVG(um.value) FILTER (
      WHERE um.metric_name = 'Sleep Duration'
        AND um.measurement_date >= CURRENT_DATE - (time_filter_days || ' days')::INTERVAL
    ) AS avg_sleep,
    
    AVG(um.value) FILTER (
      WHERE um.metric_name = 'Sleep Efficiency'
        AND um.measurement_date >= CURRENT_DATE - (time_filter_days || ' days')::INTERVAL
    ) AS avg_sleep_efficiency,
    
    -- Sleep за последние 7 дней
    AVG(um.value) FILTER (
      WHERE um.metric_name = 'Sleep Duration' 
        AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'
    ) AS avg_sleep_last_7d,
    
    -- Recovery (за весь период)
    AVG(um.value) FILTER (
      WHERE um.metric_name = 'Recovery Score'
        AND um.measurement_date >= CURRENT_DATE - (time_filter_days || ' days')::INTERVAL
    ) AS avg_recovery,
    
    -- Recovery за последние 7 дней
    AVG(um.value) FILTER (
      WHERE um.metric_name = 'Recovery Score' 
        AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'
    ) AS avg_recovery_last_7d,
    
    -- Heart metrics (за весь период)
    AVG(um.value) FILTER (
      WHERE um.metric_name = 'HRV'
        AND um.measurement_date >= CURRENT_DATE - (time_filter_days || ' days')::INTERVAL
    ) AS avg_hrv,
    
    AVG(um.value) FILTER (
      WHERE um.metric_name = 'Resting Heart Rate'
        AND um.measurement_date >= CURRENT_DATE - (time_filter_days || ' days')::INTERVAL
    ) AS avg_resting_hr,
    
    -- Последний вес
    (
      SELECT bc.weight 
      FROM body_composition bc 
      WHERE bc.user_id = cp.user_id 
      ORDER BY bc.measurement_date DESC 
      LIMIT 1
    ) AS latest_weight,
    
    -- Последний процент жира
    (
      SELECT bc.body_fat_percentage 
      FROM body_composition bc 
      WHERE bc.user_id = cp.user_id 
      ORDER BY bc.measurement_date DESC 
      LIMIT 1
    ) AS latest_body_fat,
    
    -- Weekly consistency
    CASE 
      WHEN COUNT(DISTINCT um.measurement_date) FILTER (
        WHERE um.measurement_date >= CURRENT_DATE - (time_filter_days || ' days')::INTERVAL
      ) >= 7 
      THEN ROUND(
        (
          COUNT(DISTINCT um.measurement_date) FILTER (
            WHERE um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'
          )::NUMERIC / 7 * 100
        )
      )
      ELSE 0 
    END AS weekly_consistency
    
  FROM challenge_participants cp
  JOIN profiles p ON p.user_id = cp.user_id
  LEFT JOIN challenge_points cpt ON cpt.user_id = cp.user_id AND cpt.challenge_id = cp.challenge_id
  LEFT JOIN unified_metrics um ON um.user_id = cp.user_id
  LEFT JOIN workouts w ON w.user_id = cp.user_id
  WHERE (p_challenge_id IS NULL OR cp.challenge_id = p_challenge_id)
    AND can_view_profile(auth.uid(), cp.user_id)
  GROUP BY cp.user_id, cp.challenge_id, p.username, p.full_name, p.avatar_url, cpt.points, cpt.streak_days
  ORDER BY COALESCE(cpt.points, 0) DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

-- Обновляем комментарий
COMMENT ON FUNCTION public.get_challenge_leaderboard IS 'Get challenge leaderboard with time period filtering (overall/week/month). Includes access control checks.';

-- Права доступа
GRANT EXECUTE ON FUNCTION public.get_challenge_leaderboard TO authenticated;