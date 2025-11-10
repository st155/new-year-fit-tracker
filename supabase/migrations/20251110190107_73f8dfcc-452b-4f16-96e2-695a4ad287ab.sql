-- Create function to automatically update Workout Count when a workout is inserted
CREATE OR REPLACE FUNCTION update_daily_workout_count()
RETURNS TRIGGER AS $$
DECLARE
  workout_date DATE;
  daily_count INTEGER;
BEGIN
  -- Get the date of the workout
  workout_date := DATE(NEW.start_time);
  
  -- Count total workouts for this user on this date
  SELECT COUNT(*)::INTEGER INTO daily_count
  FROM workouts
  WHERE user_id = NEW.user_id 
    AND DATE(start_time) = workout_date;
  
  -- Upsert the Workout Count metric
  INSERT INTO unified_metrics (
    user_id,
    metric_name,
    metric_category,
    value,
    unit,
    measurement_date,
    source,
    external_id,
    priority
  ) VALUES (
    NEW.user_id,
    'Workout Count',
    'activity',
    daily_count,
    'count',
    workout_date,
    'aggregated',
    'workout_count_' || workout_date || '_' || NEW.user_id,
    10
  )
  ON CONFLICT (user_id, metric_name, measurement_date, source) 
  DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on workouts table
DROP TRIGGER IF EXISTS workout_count_trigger ON workouts;
CREATE TRIGGER workout_count_trigger
  AFTER INSERT ON workouts
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_workout_count();