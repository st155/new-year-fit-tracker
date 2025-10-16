-- Add measurement_date column to activity_feed for proper daily aggregation
ALTER TABLE public.activity_feed 
ADD COLUMN IF NOT EXISTS measurement_date DATE;

-- Update existing records to set measurement_date from created_at
UPDATE public.activity_feed 
SET measurement_date = DATE(created_at) 
WHERE measurement_date IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_subtype_date 
ON public.activity_feed(user_id, activity_subtype, measurement_date);

-- Update the create_activity_feed_entry function to properly aggregate sleep data
CREATE OR REPLACE FUNCTION public.create_activity_feed_entry()
RETURNS TRIGGER AS $$
DECLARE
  user_profile RECORD;
  v_action_text TEXT;
  metric_info RECORD;
  strain_value NUMERIC;
  calories_value NUMERIC;
  existing_entry_id UUID;
  v_date DATE;
  sleep_hours NUMERIC;
  recovery_value NUMERIC;
  total_sleep NUMERIC;
  steps_value INTEGER;
BEGIN
  -- Get user profile
  SELECT username, full_name INTO user_profile
  FROM public.profiles
  WHERE user_id = NEW.user_id;
  
  v_date := DATE(COALESCE(NEW.measurement_date, NEW.start_time, NOW()));
  
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
    
    v_action_text := COALESCE(user_profile.username, 'user') || ' completed a workout';
    
    IF NEW.calories_burned IS NOT NULL THEN
      v_action_text := v_action_text || ', ' || ROUND(NEW.calories_burned::numeric, 0) || ' kcal';
    END IF;
    
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
    v_action_text := COALESCE(user_profile.username, 'user') || ' updated body composition';
    IF NEW.weight IS NOT NULL THEN
      v_action_text := v_action_text || ' (weight: ' || NEW.weight || ' kg)';
    END IF;
    
  ELSIF TG_TABLE_NAME = 'goals' THEN
    v_action_text := COALESCE(user_profile.username, 'user') || ' created a new goal: ' || NEW.goal_name;
    IF NEW.target_value IS NOT NULL THEN
      v_action_text := v_action_text || ' (' || NEW.target_value || COALESCE(' ' || NEW.target_unit, '') || ')';
    END IF;

  ELSIF TG_TABLE_NAME = 'metric_values' THEN
    SELECT metric_name, metric_category, unit, source INTO metric_info
    FROM public.user_metrics WHERE id = NEW.metric_id;
    
    -- Handle Sleep - aggregate all sleep cycles for the day
    IF metric_info.metric_category = 'sleep' AND metric_info.metric_name = 'Sleep Duration' THEN
      -- Calculate total sleep for the day
      SELECT COALESCE(SUM(value), 0) INTO total_sleep
      FROM public.metric_values mv
      JOIN public.user_metrics um ON um.id = mv.metric_id
      WHERE mv.user_id = NEW.user_id
        AND um.metric_category = 'sleep'
        AND um.metric_name = 'Sleep Duration'
        AND mv.measurement_date = NEW.measurement_date;
      
      -- Get recovery for same date
      SELECT value INTO recovery_value
      FROM public.metric_values mv
      JOIN public.user_metrics um ON um.id = mv.metric_id
      WHERE mv.user_id = NEW.user_id
        AND um.metric_category = 'recovery'
        AND mv.measurement_date = NEW.measurement_date
      LIMIT 1;
      
      -- Create/update consolidated sleep + recovery entry
      DECLARE
        hours INTEGER;
        minutes INTEGER;
        formatted_time TEXT;
      BEGIN
        hours := FLOOR(total_sleep);
        minutes := ROUND((total_sleep - hours) * 60);
        formatted_time := hours || 'h ' || minutes || 'm';
        
        v_action_text := COALESCE(user_profile.username, 'user') || ' slept ' || formatted_time;
        
        IF recovery_value IS NOT NULL THEN
          v_action_text := v_action_text || ', ' || ROUND(recovery_value, 0) || '% recovery';
        END IF;
      END;
      
      -- Check for existing sleep entry for this date using measurement_date
      SELECT id INTO existing_entry_id
      FROM public.activity_feed
      WHERE user_id = NEW.user_id
        AND activity_subtype = 'sleep_recovery'
        AND measurement_date = NEW.measurement_date;
      
      IF existing_entry_id IS NOT NULL THEN
        UPDATE public.activity_feed
        SET action_text = v_action_text,
            aggregated_data = jsonb_build_object(
              'sleep_hours', total_sleep,
              'recovery_percentage', recovery_value
            ),
            updated_at = NOW()
        WHERE id = existing_entry_id;
        RETURN NEW;
      END IF;
      
      INSERT INTO public.activity_feed (
        user_id, action_type, action_text, source_table, source_id,
        activity_subtype, aggregated_data, metadata, measurement_date
      ) VALUES (
        NEW.user_id, 'sleep', v_action_text, 'metric_values', NEW.id,
        'sleep_recovery',
        jsonb_build_object('sleep_hours', total_sleep, 'recovery_percentage', recovery_value),
        to_jsonb(NEW), NEW.measurement_date
      );
      RETURN NEW;
      
    -- Handle Recovery - merge with existing sleep entry
    ELSIF metric_info.metric_category = 'recovery' THEN
      SELECT id, aggregated_data INTO existing_entry_id, sleep_hours
      FROM public.activity_feed
      WHERE user_id = NEW.user_id
        AND activity_subtype = 'sleep_recovery'
        AND measurement_date = NEW.measurement_date
      LIMIT 1;
      
      IF existing_entry_id IS NOT NULL THEN
        -- Update existing sleep entry with recovery
        UPDATE public.activity_feed
        SET aggregated_data = aggregated_data || jsonb_build_object('recovery_percentage', NEW.value),
            action_text = action_text || ', ' || ROUND(NEW.value, 0) || '% recovery',
            updated_at = NOW()
        WHERE id = existing_entry_id;
        RETURN NEW;
      ELSE
        -- Create recovery-only entry if no sleep exists
        v_action_text := COALESCE(user_profile.username, 'user') || ' recovered ' || ROUND(NEW.value, 0) || '%';
        
        INSERT INTO public.activity_feed (
          user_id, action_type, action_text, source_table, source_id,
          activity_subtype, aggregated_data, measurement_date
        ) VALUES (
          NEW.user_id, 'recovery', v_action_text, 'metric_values', NEW.id,
          'sleep_recovery',
          jsonb_build_object('recovery_percentage', NEW.value),
          NEW.measurement_date
        );
        RETURN NEW;
      END IF;
      
    -- Handle Steps - one entry per day, update throughout the day
    ELSIF metric_info.metric_name = 'Steps' THEN
      SELECT id INTO existing_entry_id
      FROM public.activity_feed
      WHERE user_id = NEW.user_id
        AND activity_subtype = 'daily_steps'
        AND measurement_date = NEW.measurement_date;
      
      v_action_text := COALESCE(user_profile.username, 'user') || ' walked ' || 
                       ROUND(NEW.value, 0)::TEXT || ' steps';
      
      IF existing_entry_id IS NOT NULL THEN
        UPDATE public.activity_feed
        SET action_text = v_action_text,
            aggregated_data = jsonb_build_object('steps', NEW.value),
            updated_at = NOW()
        WHERE id = existing_entry_id;
        RETURN NEW;
      END IF;
      
      INSERT INTO public.activity_feed (
        user_id, action_type, action_text, source_table, source_id,
        activity_subtype, aggregated_data, measurement_date
      ) VALUES (
        NEW.user_id, 'steps', v_action_text, 'metric_values', NEW.id,
        'daily_steps',
        jsonb_build_object('steps', NEW.value),
        NEW.measurement_date
      );
      RETURN NEW;
      
    -- Handle Workouts from metric_values
    ELSIF metric_info.metric_category = 'workout' AND metric_info.source = 'whoop' THEN
      IF metric_info.metric_name = 'Workout Strain' THEN
        SELECT id INTO existing_entry_id
        FROM public.activity_feed
        WHERE user_id = NEW.user_id
          AND activity_subtype = 'workout'
          AND measurement_date = NEW.measurement_date
          AND (aggregated_data->>'external_id' = NEW.external_id OR NEW.external_id IS NULL);
        
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
          v_action_text := v_action_text || ', ' || ROUND(calories_value, 0) || ' kcal';
        END IF;
        v_action_text := v_action_text || ', ' || ROUND(NEW.value, 1) || ' strain';
        
        IF existing_entry_id IS NOT NULL THEN
          UPDATE public.activity_feed
          SET action_text = v_action_text,
              aggregated_data = aggregated_data || jsonb_build_object(
                'strain', NEW.value,
                'calories', calories_value
              ),
              updated_at = NOW()
          WHERE id = existing_entry_id;
          RETURN NEW;
        END IF;
        
        INSERT INTO public.activity_feed (
          user_id, action_type, action_text, source_table, source_id,
          activity_subtype, aggregated_data, measurement_date
        ) VALUES (
          NEW.user_id, 'workout', v_action_text, 'metric_values', NEW.id,
          'workout',
          jsonb_build_object('strain', NEW.value, 'calories', calories_value, 'external_id', NEW.external_id),
          NEW.measurement_date
        );
        RETURN NEW;
      ELSE
        RETURN NEW; -- Skip other workout metrics to avoid duplicates
      END IF;
      
    -- Skip other sleep/workout metrics that are already aggregated
    ELSIF metric_info.metric_category IN ('sleep', 'workout') THEN
      RETURN NEW;
    END IF;
  END IF;
  
  -- For other types, create entry normally
  IF v_action_text IS NOT NULL THEN
    INSERT INTO public.activity_feed (
      user_id, action_type, action_text, source_table, source_id, metadata, measurement_date
    ) VALUES (
      NEW.user_id, TG_TABLE_NAME, v_action_text, TG_TABLE_NAME, NEW.id, to_jsonb(NEW), v_date
    )
    ON CONFLICT (source_id, source_table) DO UPDATE
    SET action_text = EXCLUDED.action_text,
        metadata = EXCLUDED.metadata,
        measurement_date = EXCLUDED.measurement_date,
        updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;