-- Fix ambiguous "action_text" reference causing trigger failures on metric inserts (e.g., recovery/sleep)
-- Rename local variable to v_action_text and qualify column references

CREATE OR REPLACE FUNCTION public.create_activity_feed_entry()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_profile RECORD;
  v_action_text TEXT; -- renamed to avoid ambiguity with column
  metric_info RECORD;
  strain_value NUMERIC;
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
    -- Check if we already have an activity feed entry for this workout
    SELECT id INTO existing_entry_id
    FROM public.activity_feed
    WHERE user_id = NEW.user_id
      AND source_table = 'workouts'
      AND source_id = NEW.id;
    
    IF existing_entry_id IS NOT NULL THEN
      -- Already have an entry for this workout, skip
      RETURN NEW;
    END IF;
    
    v_action_text := COALESCE(user_profile.username, 'user');
    v_action_text := v_action_text || ' made an Activity';
    
    -- Add calories
    IF NEW.calories_burned IS NOT NULL THEN
      v_action_text := v_action_text || ', ' || ROUND(NEW.calories_burned::numeric, 0) || 'kcal';
    END IF;
    
    -- Try to get strain from metric_values for this workout
    SELECT mv.value INTO strain_value
    FROM public.metric_values mv
    JOIN public.user_metrics um ON um.id = mv.metric_id
    WHERE mv.user_id = NEW.user_id
      AND um.metric_name = 'Workout Strain'
      AND mv.measurement_date = DATE(NEW.start_time)
      AND mv.external_id = NEW.external_id
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
    
    -- Only create activity feed entries for workout and recovery related metrics
    IF metric_info.metric_category IN ('workout', 'recovery', 'sleep', 'cardio') THEN
      v_action_text := COALESCE(user_profile.username, 'user');
      
      -- Format based on metric category
      IF metric_info.metric_category = 'workout' THEN
        -- Skip workout metrics if we already have a workout entry
        IF EXISTS (
          SELECT 1 FROM public.activity_feed
          WHERE user_id = NEW.user_id
            AND source_table = 'workouts'
            AND DATE(created_at) = NEW.measurement_date
        ) THEN
          RETURN NEW;
        END IF;
        
        v_action_text := v_action_text || ' completed a workout';
        IF metric_info.metric_name = 'Workout Strain' THEN
          v_action_text := v_action_text || ', Strain: ' || ROUND(NEW.value::numeric, 1);
        ELSIF metric_info.metric_name = 'Workout Calories' THEN
          v_action_text := v_action_text || ', ' || ROUND(NEW.value::numeric, 0) || 'kcal';
        END IF;
        
      ELSIF metric_info.metric_category = 'recovery' THEN
        -- Check for existing recovery entry for today
        SELECT id INTO existing_entry_id
        FROM public.activity_feed af
        WHERE af.user_id = NEW.user_id
          AND af.action_text LIKE '%recovered%'
          AND DATE(af.created_at) = NEW.measurement_date;
        
        IF existing_entry_id IS NOT NULL THEN
          -- Update existing entry
          UPDATE public.activity_feed
          SET action_text = COALESCE(user_profile.username, 'user') || ' recovered ' || ROUND(NEW.value::numeric, 0) || '%',
              updated_at = NOW()
          WHERE id = existing_entry_id;
          RETURN NEW;
        END IF;
        
        v_action_text := v_action_text || ' recovered ' || ROUND(NEW.value::numeric, 0) || '%';
        
      ELSIF metric_info.metric_category = 'sleep' THEN
        -- Handle Sleep Duration specifically
        IF metric_info.metric_name = 'Sleep Duration' THEN
          -- Sleep Duration is stored in hours (e.g., 6.85), convert to HH:MM format
          DECLARE
            hours INTEGER;
            minutes INTEGER;
            formatted_time TEXT;
          BEGIN
            hours := FLOOR(NEW.value::numeric);
            minutes := ROUND((NEW.value::numeric - hours) * 60);
            formatted_time := hours || ':' || LPAD(minutes::text, 2, '0');
            
            -- Check for existing sleep entry for today
            SELECT id INTO existing_entry_id
            FROM public.activity_feed af
            WHERE af.user_id = NEW.user_id
              AND af.action_text LIKE '%slept%'
              AND DATE(af.created_at) = NEW.measurement_date;
            
            IF existing_entry_id IS NOT NULL THEN
              -- Update existing entry
              UPDATE public.activity_feed
              SET action_text = COALESCE(user_profile.username, 'user') || ' slept ' || formatted_time,
                  updated_at = NOW()
              WHERE id = existing_entry_id;
              RETURN NEW;
            END IF;
            
            v_action_text := v_action_text || ' slept ' || formatted_time;
          END;
        ELSE
          -- For other sleep metrics, aggregate as before
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
            -- Update existing sleep entry with aggregated hours
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
      -- Don't create activity feed entries for non-activity metrics
      RETURN NEW;
    END IF;
  END IF;
  
  -- Insert into activity feed (only if we didn't update an existing entry)
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
  );
  
  RETURN NEW;
END;
$function$;