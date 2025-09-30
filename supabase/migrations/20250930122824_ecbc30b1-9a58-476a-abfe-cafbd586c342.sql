-- Create triggers to populate activity_feed table
-- These triggers will call the create_activity_feed_entry() function after INSERT

-- Trigger for workouts table
CREATE TRIGGER create_activity_feed_from_workouts
  AFTER INSERT ON public.workouts
  FOR EACH ROW
  EXECUTE FUNCTION public.create_activity_feed_entry();

-- Trigger for metric_values table
CREATE TRIGGER create_activity_feed_from_metric_values
  AFTER INSERT ON public.metric_values
  FOR EACH ROW
  EXECUTE FUNCTION public.create_activity_feed_entry();

-- Trigger for measurements table
CREATE TRIGGER create_activity_feed_from_measurements
  AFTER INSERT ON public.measurements
  FOR EACH ROW
  EXECUTE FUNCTION public.create_activity_feed_entry();

-- Trigger for body_composition table
CREATE TRIGGER create_activity_feed_from_body_composition
  AFTER INSERT ON public.body_composition
  FOR EACH ROW
  EXECUTE FUNCTION public.create_activity_feed_entry();

-- Trigger for goals table
CREATE TRIGGER create_activity_feed_from_goals
  AFTER INSERT ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.create_activity_feed_entry();

-- Now backfill existing workout metric_values into activity_feed
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