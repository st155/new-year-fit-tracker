-- Update activity feed trigger function for better human-readable messages
CREATE OR REPLACE FUNCTION public.create_activity_feed_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile RECORD;
  action_text TEXT;
  metric_info RECORD;
BEGIN
  -- Get user profile
  SELECT username, full_name INTO user_profile
  FROM public.profiles
  WHERE user_id = NEW.user_id;
  
  -- Generate action text based on table
  IF TG_TABLE_NAME = 'workouts' THEN
    action_text := COALESCE(user_profile.full_name, user_profile.username);
    
    -- More descriptive workout messages
    IF NEW.workout_type ILIKE '%run%' OR NEW.workout_type ILIKE '%бег%' THEN
      action_text := action_text || ' пробежал';
      IF NEW.distance_km IS NOT NULL THEN
        action_text := action_text || ' ' || ROUND(NEW.distance_km::numeric, 2) || ' км';
      END IF;
    ELSIF NEW.workout_type ILIKE '%bike%' OR NEW.workout_type ILIKE '%велос%' THEN
      action_text := action_text || ' проехал на велосипеде';
      IF NEW.distance_km IS NOT NULL THEN
        action_text := action_text || ' ' || ROUND(NEW.distance_km::numeric, 2) || ' км';
      END IF;
    ELSIF NEW.workout_type ILIKE '%swim%' OR NEW.workout_type ILIKE '%плав%' THEN
      action_text := action_text || ' проплыл';
      IF NEW.distance_km IS NOT NULL THEN
        action_text := action_text || ' ' || ROUND(NEW.distance_km::numeric * 1000, 0) || ' м';
      END IF;
    ELSIF NEW.workout_type ILIKE '%strength%' OR NEW.workout_type ILIKE '%силов%' OR NEW.workout_type ILIKE '%weight%' THEN
      action_text := action_text || ' завершил силовую тренировку';
    ELSE
      action_text := action_text || ' завершил тренировку ' || NEW.workout_type;
    END IF;
    
    -- Add duration and calories
    IF NEW.duration_minutes IS NOT NULL THEN
      action_text := action_text || ' (' || NEW.duration_minutes || ' мин';
      IF NEW.calories_burned IS NOT NULL THEN
        action_text := action_text || ', ' || ROUND(NEW.calories_burned::numeric, 0) || ' ккал';
      END IF;
      action_text := action_text || ')';
    ELSIF NEW.calories_burned IS NOT NULL THEN
      action_text := action_text || ' (сжёг ' || ROUND(NEW.calories_burned::numeric, 0) || ' ккал)';
    END IF;
    
    -- Add source badge
    IF NEW.source = 'whoop' THEN
      action_text := action_text || ' [Whoop]';
    ELSIF NEW.source = 'apple_health' THEN
      action_text := action_text || ' [Apple Health]';
    ELSIF NEW.source = 'withings' THEN
      action_text := action_text || ' [Withings]';
    ELSIF NEW.source = 'garmin' THEN
      action_text := action_text || ' [Garmin]';
    END IF;
    
  ELSIF TG_TABLE_NAME = 'measurements' THEN
    SELECT goal_name INTO action_text FROM public.goals WHERE id = NEW.goal_id;
    action_text := COALESCE(user_profile.full_name, user_profile.username) || 
                   ' записал измерение: ' || COALESCE(action_text, 'цель') || 
                   ' = ' || NEW.value || ' ' || NEW.unit;
                   
  ELSIF TG_TABLE_NAME = 'body_composition' THEN
    action_text := COALESCE(user_profile.full_name, user_profile.username) || 
                   ' обновил состав тела';
    IF NEW.weight IS NOT NULL THEN
      action_text := action_text || ' (вес: ' || NEW.weight || ' кг)';
    END IF;
    
  ELSIF TG_TABLE_NAME = 'goals' THEN
    action_text := COALESCE(user_profile.full_name, user_profile.username) || 
                   ' создал новую цель: ' || NEW.goal_name;
    IF NEW.target_value IS NOT NULL THEN
      action_text := action_text || ' (' || NEW.target_value || 
                     COALESCE(' ' || NEW.target_unit, '') || ')';
    END IF;

  ELSIF TG_TABLE_NAME = 'metric_values' THEN
    -- Get metric information
    SELECT metric_name, metric_category, unit, source 
    INTO metric_info
    FROM public.user_metrics 
    WHERE id = NEW.metric_id;
    
    -- Only create activity feed entries for workout and recovery related metrics
    IF metric_info.metric_category IN ('workout', 'recovery', 'sleep', 'cardio') THEN
      action_text := COALESCE(user_profile.full_name, user_profile.username);
      
      -- Format based on metric category
      IF metric_info.metric_category = 'workout' THEN
        action_text := action_text || ' завершил тренировку';
        IF metric_info.metric_name = 'Workout Strain' THEN
          action_text := action_text || ', Strain: ' || ROUND(NEW.value::numeric, 1);
        ELSIF metric_info.metric_name = 'Workout Calories' THEN
          action_text := action_text || ' (сжёг ' || ROUND(NEW.value::numeric, 0) || ' ккал)';
        END IF;
      ELSIF metric_info.metric_category = 'recovery' THEN
        action_text := action_text || ' восстановился на ' || ROUND(NEW.value::numeric, 0) || '%';
      ELSIF metric_info.metric_category = 'sleep' THEN
        action_text := action_text || ' спал ' || ROUND(NEW.value::numeric / 60, 1) || ' ч (качество: ' || ROUND((NEW.value::numeric / 480 * 100), 0) || '%)';
      ELSIF metric_info.metric_category = 'cardio' THEN
        IF metric_info.metric_name = 'VO2Max' THEN
          action_text := action_text || ' обновил VO2Max: ' || ROUND(NEW.value::numeric, 1) || ' ' || metric_info.unit;
        END IF;
      END IF;
      
      -- Add source information
      IF metric_info.source = 'whoop' THEN
        action_text := action_text || ' [Whoop]';
      ELSIF metric_info.source = 'apple_health' THEN
        action_text := action_text || ' [Apple Health]';
      ELSIF metric_info.source = 'withings' THEN
        action_text := action_text || ' [Withings]';
      ELSIF metric_info.source = 'garmin' THEN
        action_text := action_text || ' [Garmin]';
      END IF;
    ELSE
      -- Don't create activity feed entries for non-activity metrics
      RETURN NEW;
    END IF;
  END IF;
  
  -- Insert into activity feed
  INSERT INTO public.activity_feed (
    user_id,
    action_type,
    action_text,
    source_table,
    source_id,
    metadata
  ) VALUES (
    NEW.user_id,
    TG_TABLE_NAME,
    action_text,
    TG_TABLE_NAME,
    NEW.id,
    to_jsonb(NEW)
  );
  
  RETURN NEW;
END;
$$;

-- Recreate all triggers to use updated function
DROP TRIGGER IF EXISTS trg_activity_feed_workouts ON public.workouts;
CREATE TRIGGER trg_activity_feed_workouts
AFTER INSERT ON public.workouts
FOR EACH ROW EXECUTE FUNCTION public.create_activity_feed_entry();

DROP TRIGGER IF EXISTS trg_activity_feed_measurements ON public.measurements;
CREATE TRIGGER trg_activity_feed_measurements
AFTER INSERT ON public.measurements
FOR EACH ROW EXECUTE FUNCTION public.create_activity_feed_entry();

DROP TRIGGER IF EXISTS trg_activity_feed_body_composition ON public.body_composition;
CREATE TRIGGER trg_activity_feed_body_composition
AFTER INSERT ON public.body_composition
FOR EACH ROW EXECUTE FUNCTION public.create_activity_feed_entry();

DROP TRIGGER IF EXISTS trg_activity_feed_goals ON public.goals;
CREATE TRIGGER trg_activity_feed_goals
AFTER INSERT ON public.goals
FOR EACH ROW EXECUTE FUNCTION public.create_activity_feed_entry();

DROP TRIGGER IF EXISTS trg_activity_feed_metric_values ON public.metric_values;
CREATE TRIGGER trg_activity_feed_metric_values
AFTER INSERT ON public.metric_values
FOR EACH ROW EXECUTE FUNCTION public.create_activity_feed_entry();