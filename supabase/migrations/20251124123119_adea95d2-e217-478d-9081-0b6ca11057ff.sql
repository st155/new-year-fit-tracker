-- Создание отдельной роли для views и исправление Security Definer Views
-- Проблема: views принадлежащие системным ролям считаются security definer
-- Решение: создаём обычную роль view_owner без привилегий SECURITY DEFINER

-- 1. Создаём роль для владения views (если не существует)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'view_owner') THEN
    CREATE ROLE view_owner NOLOGIN;
    RAISE NOTICE 'Created role: view_owner';
  END IF;
END $$;

-- 2. Даём роли минимальные необходимые права
GRANT USAGE ON SCHEMA public TO view_owner;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO view_owner;

-- 3. Меняем владельца всех проблемных views на view_owner
DO $$
DECLARE
  view_name TEXT;
  views_list TEXT[] := ARRAY[
    'activity_summary_view',
    'body_composition_view',
    'challenge_leaderboard_month',
    'challenge_leaderboard_v2',
    'challenge_leaderboard_week',
    'client_health_scores',
    'client_unified_metrics',
    'data_quality_trends',
    'edge_function_performance',
    'goal_current_values',
    'habit_analytics',
    'job_processing_stats',
    'recovery_metrics_view',
    'sleep_analysis_view',
    'trainer_client_summary',
    'webhook_processing_stats'
  ];
  updated_count INTEGER := 0;
BEGIN
  FOREACH view_name IN ARRAY views_list
  LOOP
    BEGIN
      -- Изменяем владельца на роль view_owner
      EXECUTE format('ALTER VIEW public.%I OWNER TO view_owner', view_name);
      
      -- Даём права на SELECT всем необходимым ролям
      EXECUTE format('GRANT SELECT ON public.%I TO authenticated', view_name);
      EXECUTE format('GRANT SELECT ON public.%I TO anon', view_name);
      EXECUTE format('GRANT SELECT ON public.%I TO service_role', view_name);
      
      updated_count := updated_count + 1;
      RAISE NOTICE 'Updated view: % (% of 16)', view_name, updated_count;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to update view %: %', view_name, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '✅ Migration complete: % views now owned by view_owner role', updated_count;
END $$;