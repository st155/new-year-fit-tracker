-- Clear old activity feed entries and regenerate with new format
DELETE FROM public.activity_feed;

-- Regenerate from workouts
INSERT INTO public.activity_feed (user_id, action_type, action_text, source_table, source_id, metadata, created_at)
SELECT 
  w.user_id,
  'workouts',
  COALESCE(p.full_name, p.username) ||
  CASE 
    WHEN w.workout_type ILIKE '%run%' OR w.workout_type ILIKE '%бег%' THEN ' пробежал' ||
      CASE WHEN w.distance_km IS NOT NULL THEN ' ' || ROUND(w.distance_km::numeric, 2) || ' км' ELSE '' END
    WHEN w.workout_type ILIKE '%bike%' OR w.workout_type ILIKE '%велос%' THEN ' проехал на велосипеде' ||
      CASE WHEN w.distance_km IS NOT NULL THEN ' ' || ROUND(w.distance_km::numeric, 2) || ' км' ELSE '' END
    WHEN w.workout_type ILIKE '%swim%' OR w.workout_type ILIKE '%плав%' THEN ' проплыл' ||
      CASE WHEN w.distance_km IS NOT NULL THEN ' ' || ROUND(w.distance_km::numeric * 1000, 0) || ' м' ELSE '' END
    WHEN w.workout_type ILIKE '%strength%' OR w.workout_type ILIKE '%силов%' OR w.workout_type ILIKE '%weight%' THEN ' завершил силовую тренировку'
    ELSE ' завершил тренировку ' || w.workout_type
  END ||
  CASE 
    WHEN w.duration_minutes IS NOT NULL THEN 
      ' (' || w.duration_minutes || ' мин' ||
      CASE WHEN w.calories_burned IS NOT NULL THEN ', ' || ROUND(w.calories_burned::numeric, 0) || ' ккал' ELSE '' END ||
      ')'
    WHEN w.calories_burned IS NOT NULL THEN ' (сжёг ' || ROUND(w.calories_burned::numeric, 0) || ' ккал)'
    ELSE ''
  END ||
  CASE w.source
    WHEN 'whoop' THEN ' [Whoop]'
    WHEN 'apple_health' THEN ' [Apple Health]'
    WHEN 'withings' THEN ' [Withings]'
    WHEN 'garmin' THEN ' [Garmin]'
    ELSE ''
  END,
  'workouts',
  w.id,
  to_jsonb(w),
  w.start_time
FROM public.workouts w
JOIN public.profiles p ON w.user_id = p.user_id
WHERE w.created_at > now() - interval '90 days';

-- Regenerate from metric_values (workout, recovery, sleep, cardio only)
INSERT INTO public.activity_feed (user_id, action_type, action_text, source_table, source_id, metadata, created_at)
SELECT 
  mv.user_id,
  'metric_values',
  COALESCE(p.full_name, p.username) ||
  CASE 
    WHEN um.metric_category = 'workout' THEN ' завершил тренировку' ||
      CASE 
        WHEN um.metric_name = 'Workout Strain' THEN ', Strain: ' || ROUND(mv.value::numeric, 1)
        WHEN um.metric_name = 'Workout Calories' THEN ' (сжёг ' || ROUND(mv.value::numeric, 0) || ' ккал)'
        ELSE ''
      END
    WHEN um.metric_category = 'recovery' THEN ' восстановился на ' || ROUND(mv.value::numeric, 0) || '%'
    WHEN um.metric_category = 'sleep' THEN ' спал ' || ROUND(mv.value::numeric / 60, 1) || ' ч (качество: ' || ROUND((mv.value::numeric / 480 * 100), 0) || '%)'
    WHEN um.metric_category = 'cardio' AND um.metric_name = 'VO2Max' THEN ' обновил VO2Max: ' || ROUND(mv.value::numeric, 1) || ' ' || um.unit
    ELSE ''
  END ||
  CASE um.source
    WHEN 'whoop' THEN ' [Whoop]'
    WHEN 'apple_health' THEN ' [Apple Health]'
    WHEN 'withings' THEN ' [Withings]'
    WHEN 'garmin' THEN ' [Garmin]'
    ELSE ''
  END,
  'metric_values',
  mv.id,
  to_jsonb(mv),
  mv.created_at
FROM public.metric_values mv
JOIN public.user_metrics um ON mv.metric_id = um.id
JOIN public.profiles p ON mv.user_id = p.user_id
WHERE um.metric_category IN ('workout', 'recovery', 'sleep', 'cardio')
  AND (um.metric_category <> 'cardio' OR um.metric_name = 'VO2Max')
  AND mv.created_at > now() - interval '90 days';