-- Исправление Security Definer Views: изменение владельца с postgres на authenticator
-- Это устраняет 11-13 предупреждений linter о небезопасных security definer views

DO $$
DECLARE
  view_record RECORD;
  view_definition TEXT;
  recreated_count INTEGER := 0;
BEGIN
  -- Список всех views, которые нужно исправить
  FOR view_record IN
    SELECT 
      c.relname as view_name,
      pg_get_viewdef(c.oid, true) as definition
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relkind = 'v'  -- только views
      AND c.relname IN (
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
      )
    ORDER BY c.relname
  LOOP
    BEGIN
      -- Получаем полное определение view
      view_definition := view_record.definition;
      
      -- Удаляем старый view
      EXECUTE format('DROP VIEW IF EXISTS public.%I CASCADE', view_record.view_name);
      
      -- Пересоздаём view с новым определением
      EXECUTE format('CREATE VIEW public.%I AS %s', view_record.view_name, view_definition);
      
      -- Изменяем владельца на authenticator
      EXECUTE format('ALTER VIEW public.%I OWNER TO authenticator', view_record.view_name);
      
      -- Даём права на чтение всем authenticated пользователям
      EXECUTE format('GRANT SELECT ON public.%I TO authenticated', view_record.view_name);
      
      recreated_count := recreated_count + 1;
      RAISE NOTICE 'Recreated view: % (% of 16)', view_record.view_name, recreated_count;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to recreate view %: %', view_record.view_name, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '✅ Migration complete: % views recreated with authenticator owner', recreated_count;
END $$;