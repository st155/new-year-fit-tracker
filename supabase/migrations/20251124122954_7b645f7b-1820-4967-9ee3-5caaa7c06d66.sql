-- Исправление Security Definer Views: изменение владельца на роль authenticated
-- Views принадлежащие системным ролям (postgres, authenticator) считаются security definer
-- Назначаем владельцем роль authenticated для соблюдения RLS policies

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
      -- Изменяем владельца на роль authenticated
      EXECUTE format('ALTER VIEW public.%I OWNER TO authenticated', view_name);
      
      -- Даём права на SELECT
      EXECUTE format('GRANT SELECT ON public.%I TO authenticated', view_name);
      EXECUTE format('GRANT SELECT ON public.%I TO anon', view_name);
      
      updated_count := updated_count + 1;
      RAISE NOTICE 'Updated owner for view: % (% of 16)', view_name, updated_count;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to update view %: %', view_name, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '✅ Owner change complete: % views now owned by authenticated role', updated_count;
END $$;