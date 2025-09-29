-- Modify the create_activity_feed_entry function to handle metric_values table
CREATE OR REPLACE FUNCTION public.create_activity_feed_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    action_text := COALESCE(user_profile.full_name, user_profile.username) || 
                   ' завершил тренировку ' || NEW.workout_type;
    IF NEW.duration_minutes IS NOT NULL THEN
      action_text := action_text || ' (' || NEW.duration_minutes || ' мин)';
    END IF;
    IF NEW.calories_burned IS NOT NULL THEN
      action_text := action_text || ', сжег ' || NEW.calories_burned || ' ккал';
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
          action_text := action_text || ' (Strain: ' || ROUND(NEW.value::numeric, 1) || ')';
        ELSIF metric_info.metric_name = 'Workout Calories' THEN
          action_text := action_text || ' (сжег ' || ROUND(NEW.value::numeric, 0) || ' ккал)';
        END IF;
      ELSIF metric_info.metric_category = 'recovery' THEN
        action_text := action_text || ' обновил восстановление (Recovery: ' || ROUND(NEW.value::numeric, 0) || '%)';
      ELSIF metric_info.metric_category = 'sleep' THEN
        action_text := action_text || ' записал сон (Sleep Performance: ' || ROUND(NEW.value::numeric, 0) || '%)';
      ELSIF metric_info.metric_category = 'cardio' THEN
        IF metric_info.metric_name = 'VO2Max' THEN
          action_text := action_text || ' обновил VO2Max (' || ROUND(NEW.value::numeric, 1) || ' ' || metric_info.unit || ')';
        END IF;
      END IF;
      
      -- Add source information
      IF metric_info.source = 'whoop' THEN
        action_text := action_text || ' [Whoop]';
      ELSIF metric_info.source = 'apple_health' THEN
        action_text := action_text || ' [Apple Health]';
      ELSIF metric_info.source = 'withings' THEN
        action_text := action_text || ' [Withings]';
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
$function$;

-- Add trigger for metric_values table
DROP TRIGGER IF EXISTS create_metric_values_activity ON public.metric_values;
CREATE TRIGGER create_metric_values_activity
  AFTER INSERT ON public.metric_values
  FOR EACH ROW
  EXECUTE FUNCTION public.create_activity_feed_entry();