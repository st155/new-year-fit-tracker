-- Drop and recreate the create_activity_feed_entry function with Whoop workout support
DROP FUNCTION IF EXISTS public.create_activity_feed_entry() CASCADE;

CREATE OR REPLACE FUNCTION public.create_activity_feed_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  user_profile RECORD;
  v_action_text TEXT;
  metric_info RECORD;
  strain_value NUMERIC;
  calories_value NUMERIC;
  existing_entry_id UUID;
  existing_sleep_hours NUMERIC;
  total_sleep_hours NUMERIC;
BEGIN
  -- Get user profile
  SELECT username, full_name INTO user_profile
  FROM public.profiles
  WHERE user_id = NEW.user_id;
  
  -- Generate action text based on table
  IF TG_TABLE_NAME = 'workouts' THEN
    -- Ensure single entry per workout
    SELECT id INTO existing_entry_id
    FROM public.activity_feed
    WHERE user_id = NEW.user_id
      AND source_table = 'workouts'
      AND source_id = NEW.id;
    
    IF existing_entry_id IS NOT NULL THEN
      RETURN NEW;
    END IF;
    
    v_action_text := COALESCE(user_profile.username, 'user');
    v_action_text := v_action_text || ' completed a workout';
    
    IF NEW.calories_burned IS NOT NULL THEN
      v_action_text := v_action_text || ', ' || ROUND(NEW.calories_burned::numeric, 0) || 'kcal';
    END IF;
    
    -- Try to get strain from metric_values for this workout date/external_id
    SELECT mv.value INTO strain_value
    FROM public.metric_values mv
    JOIN public.user_metrics um ON um.id = mv.metric_id
    WHERE mv.user_id = NEW.user_id
      AND um.metric_name = 'Workout Strain'
      AND mv.measurement_date = DATE(NEW.start_time)
      AND (mv.external_id IS NULL OR mv.external_id = NEW.external_id)
    LIMIT 1;
    
    IF strain_value IS NOT NULL THEN
      v_action_text := v_action_text || ', ' || ROUND(strain_value::numeric, 1) || ' strain';
    END IF;
    
  ELSIF TG_TABLE_NAME = 'measurements' THEN
    SELECT goal_name INTO v_action_text FROM public.goals WHERE id = NEW.goal_id;
    v_action_text := COALESCE(user_profile.username, 'user') || 
                   ' recorded: ' || COALESCE(v_action_text, 'goal') || 
                   ' = ' || NEW.value || ' ' || NEW.unit;
                   
  ELSIF TG_TABLE_NAME = 'body_composition' THEN
    v_action_text := COALESCE(user_profile.username, 'user') || 
                   ' updated body composition';
    IF NEW.weight IS NOT NULL THEN
      v_action_text := v_action_text || ' (weight: ' || NEW.weight || ' kg)';
    END IF;
    
  ELSIF TG_TABLE_NAME = 'goals' THEN
    v_action_text := COALESCE(user_profile.username, 'user') || 
                   ' created a new goal: ' || NEW.goal_name;
    IF NEW.target_value IS NOT NULL THEN
      v_action_text := v_action_text || ' (' || NEW.target_value || 
                     COALESCE(' ' || NEW.target_unit, '') || ')';
    END IF;

  ELSIF TG_TABLE_NAME = 'metric_values' THEN
    -- Get metric information
    SELECT metric_name, metric_category, unit, source 
    INTO metric_info
    FROM public.user_metrics 
    WHERE id = NEW.metric_id;
    
    -- Handle Whoop workouts from metric_values
    IF metric_info.metric_category = 'workout' AND metric_info.source = 'whoop' THEN
      -- Check if this is a Workout Strain metric
      IF metric_info.metric_name = 'Workout Strain' THEN
        -- Check for existing workout entry for this date
        SELECT id INTO existing_entry_id
        FROM public.activity_feed af
        WHERE af.user_id = NEW.user_id
          AND af.source_table = 'metric_values'
          AND af.action_text LIKE '%completed a workout%'
          AND DATE(af.created_at) = NEW.measurement_date;
        
        -- Get calories if available
        SELECT mv.value INTO calories_value
        FROM public.metric_values mv
        JOIN public.user_metrics um ON um.id = mv.metric_id
        WHERE mv.user_id = NEW.user_id
          AND um.metric_name = 'Workout Calories'
          AND mv.measurement_date = NEW.measurement_date
          AND mv.external_id = NEW.external_id
        LIMIT 1;
        
        v_action_text := COALESCE(user_profile.username, 'user') || ' completed a workout';
        
        IF calories_value IS NOT NULL THEN
          v_action_text := v_action_text || ', ' || ROUND(calories_value::numeric, 0) || 'kcal';
        END IF;
        
        v_action_text := v_action_text || ', ' || ROUND(NEW.value::numeric, 1) || ' strain';
        
        IF existing_entry_id IS NOT NULL THEN
          UPDATE public.activity_feed
          SET action_text = v_action_text,
              metadata = to_jsonb(NEW),
              updated_at = NOW()
          WHERE id = existing_entry_id;
          RETURN NEW;
        END IF;
      ELSE
        -- Skip other workout metrics to avoid duplication
        RETURN NEW;
      END IF;
    ELSIF metric_info.metric_category = 'workout' THEN
      -- Skip non-Whoop workout metrics to avoid duplicates with workouts table
      RETURN NEW;
    END IF;
    
    -- Only create activity feed entries for recovery, sleep and cardio related metrics
    IF metric_info.metric_category IN ('recovery', 'sleep', 'cardio') THEN
      v_action_text := COALESCE(user_profile.username, 'user');
      
      IF metric_info.metric_category = 'recovery' THEN
        SELECT id INTO existing_entry_id
        FROM public.activity_feed af
        WHERE af.user_id = NEW.user_id
          AND af.action_text LIKE '%recovered%'
          AND DATE(af.created_at) = NEW.measurement_date;
        
        IF existing_entry_id IS NOT NULL THEN
          UPDATE public.activity_feed
          SET action_text = COALESCE(user_profile.username, 'user') || ' recovered ' || ROUND(NEW.value::numeric, 0) || '%',
              updated_at = NOW()
          WHERE id = existing_entry_id;
          RETURN NEW;
        END IF;
        
        v_action_text := v_action_text || ' recovered ' || ROUND(NEW.value::numeric, 0) || '%';
        
      ELSIF metric_info.metric_category = 'sleep' THEN
        IF metric_info.metric_name = 'Sleep Duration' THEN
          DECLARE
            hours INTEGER;
            minutes INTEGER;
            formatted_time TEXT;
          BEGIN
            hours := FLOOR(NEW.value::numeric);
            minutes := ROUND((NEW.value::numeric - hours) * 60);
            formatted_time := hours || ':' || LPAD(minutes::text, 2, '0');
            
            SELECT id INTO existing_entry_id
            FROM public.activity_feed af
            WHERE af.user_id = NEW.user_id
              AND af.action_text LIKE '%slept%'
              AND DATE(af.created_at) = NEW.measurement_date;
            
            IF existing_entry_id IS NOT NULL THEN
              UPDATE public.activity_feed
              SET action_text = COALESCE(user_profile.username, 'user') || ' slept ' || formatted_time,
                  updated_at = NOW()
              WHERE id = existing_entry_id;
              RETURN NEW;
            END IF;
            
            v_action_text := v_action_text || ' slept ' || formatted_time;
          END;
        ELSE
          SELECT af.id, 
                 CAST(SUBSTRING(af.action_text FROM 'slept ([0-9.]+)h') AS NUMERIC) 
            INTO existing_entry_id, existing_sleep_hours
          FROM public.activity_feed af
          WHERE af.user_id = NEW.user_id
            AND af.action_text LIKE '%slept%'
            AND DATE(af.created_at) = NEW.measurement_date
          ORDER BY af.created_at DESC
          LIMIT 1;
          
          total_sleep_hours := ROUND((NEW.value::numeric / 60), 1);
          
          IF existing_entry_id IS NOT NULL AND existing_sleep_hours IS NOT NULL THEN
            total_sleep_hours := existing_sleep_hours + ROUND((NEW.value::numeric / 60), 1);
            UPDATE public.activity_feed
            SET action_text = COALESCE(user_profile.username, 'user') || ' slept ' || total_sleep_hours || 'h',
                updated_at = NOW()
            WHERE id = existing_entry_id;
            RETURN NEW;
          END IF;
          
          v_action_text := v_action_text || ' slept ' || total_sleep_hours || 'h';
        END IF;
        
      ELSIF metric_info.metric_category = 'cardio' THEN
        IF metric_info.metric_name = 'VO2Max' THEN
          v_action_text := v_action_text || ' updated VO2Max: ' || ROUND(NEW.value::numeric, 1) || ' ' || metric_info.unit;
        END IF;
      END IF;
    ELSE
      RETURN NEW;
    END IF;
  END IF;
  
  -- Upsert into activity_feed using unique key (source_id, source_table)
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
    v_action_text,
    TG_TABLE_NAME,
    NEW.id,
    to_jsonb(NEW)
  )
  ON CONFLICT (source_id, source_table) DO UPDATE
  SET 
    action_text = EXCLUDED.action_text,
    metadata = EXCLUDED.metadata,
    updated_at = NOW();
  
  RETURN NEW;
END;
$function$;

-- Recreate triggers
CREATE TRIGGER activity_feed_on_workout
  AFTER INSERT OR UPDATE ON public.workouts
  FOR EACH ROW
  EXECUTE FUNCTION public.create_activity_feed_entry();

CREATE TRIGGER activity_feed_on_measurement
  AFTER INSERT OR UPDATE ON public.measurements
  FOR EACH ROW
  EXECUTE FUNCTION public.create_activity_feed_entry();

CREATE TRIGGER activity_feed_on_body_composition
  AFTER INSERT OR UPDATE ON public.body_composition
  FOR EACH ROW
  EXECUTE FUNCTION public.create_activity_feed_entry();

CREATE TRIGGER activity_feed_on_goal
  AFTER INSERT ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.create_activity_feed_entry();

CREATE TRIGGER activity_feed_on_metric_value
  AFTER INSERT OR UPDATE ON public.metric_values
  FOR EACH ROW
  EXECUTE FUNCTION public.create_activity_feed_entry();