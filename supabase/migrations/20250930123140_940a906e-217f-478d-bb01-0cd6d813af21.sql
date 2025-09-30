-- Backfill existing workout metric_values into activity_feed
-- This will create activity feed entries for Workout Strain metrics that already exist
INSERT INTO public.activity_feed (user_id, action_type, action_text, source_table, source_id, metadata, created_at)
SELECT 
  mv.user_id,
  'metric_values',
  p.username || ' completed a workout, Strain: ' || ROUND(mv.value::numeric, 1),
  'metric_values',
  mv.id,
  jsonb_build_object(
    'metric_id', mv.metric_id,
    'value', mv.value,
    'measurement_date', mv.measurement_date,
    'external_id', mv.external_id,
    'metric_name', um.metric_name,
    'unit', um.unit
  ),
  mv.created_at
FROM public.metric_values mv
JOIN public.user_metrics um ON um.id = mv.metric_id
JOIN public.profiles p ON p.user_id = mv.user_id
WHERE um.metric_name = 'Workout Strain'
  AND um.metric_category = 'workout'
  AND NOT EXISTS (
    SELECT 1 FROM public.activity_feed af
    WHERE af.source_table = 'metric_values'
      AND af.source_id = mv.id
  )
ORDER BY mv.measurement_date DESC, mv.created_at DESC;