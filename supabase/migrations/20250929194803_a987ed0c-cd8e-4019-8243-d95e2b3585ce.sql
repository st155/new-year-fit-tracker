-- Ensure activity_feed triggers exist for key tables
DO $$ BEGIN
  CREATE TRIGGER trg_activity_feed_workouts
  AFTER INSERT ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION public.create_activity_feed_entry();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_activity_feed_measurements
  AFTER INSERT ON public.measurements
  FOR EACH ROW EXECUTE FUNCTION public.create_activity_feed_entry();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_activity_feed_body_composition
  AFTER INSERT ON public.body_composition
  FOR EACH ROW EXECUTE FUNCTION public.create_activity_feed_entry();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_activity_feed_goals
  AFTER INSERT ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.create_activity_feed_entry();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_activity_feed_metric_values
  AFTER INSERT ON public.metric_values
  FOR EACH ROW EXECUTE FUNCTION public.create_activity_feed_entry();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill recent metric_values into activity_feed (safe, idempotent)
INSERT INTO public.activity_feed (id, user_id, action_type, action_text, source_table, source_id, metadata)
SELECT 
  gen_random_uuid(),
  mv.user_id,
  'metric_values',
  (
    SELECT COALESCE(p.full_name, p.username, 'Пользователь') FROM public.profiles p WHERE p.user_id = mv.user_id
  ) ||
  CASE 
    WHEN um.metric_category = 'workout' THEN ' завершил тренировку' ||
      CASE WHEN um.metric_name = 'Workout Strain' THEN ' (Strain: ' || ROUND(mv.value::numeric, 1) || ')'
           WHEN um.metric_name = 'Workout Calories' THEN ' (сжег ' || ROUND(mv.value::numeric, 0) || ' ккал)'
           ELSE '' END
    WHEN um.metric_category = 'recovery' THEN ' обновил восстановление (Recovery: ' || ROUND(mv.value::numeric, 0) || '%)'
    WHEN um.metric_category = 'sleep' THEN ' записал сон (Sleep Performance: ' || ROUND(mv.value::numeric, 0) || '%)'
    WHEN um.metric_category = 'cardio' AND um.metric_name = 'VO2Max' THEN ' обновил VO2Max (' || ROUND(mv.value::numeric, 1) || ' ' || um.unit || ')'
    ELSE ''
  END ||
  CASE um.source 
    WHEN 'whoop' THEN ' [Whoop]'
    WHEN 'apple_health' THEN ' [Apple Health]'
    WHEN 'withings' THEN ' [Withings]'
    ELSE ''
  END,
  'metric_values',
  mv.id,
  to_jsonb(mv)
FROM public.metric_values mv
JOIN public.user_metrics um ON mv.metric_id = um.id
WHERE um.metric_category IN ('workout','recovery','sleep','cardio')
  AND (um.metric_category <> 'cardio' OR um.metric_name = 'VO2Max')
  AND mv.created_at > now() - interval '90 days'
  AND NOT EXISTS (
    SELECT 1 FROM public.activity_feed af 
    WHERE af.source_table = 'metric_values' AND af.source_id = mv.id
  )
LIMIT 500;