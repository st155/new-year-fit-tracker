-- Update activity_feed table structure
ALTER TABLE activity_feed
  ADD COLUMN IF NOT EXISTS activity_subtype TEXT,
  ADD COLUMN IF NOT EXISTS aggregated_data JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_milestone BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS milestone_type TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_date ON activity_feed(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_subtype ON activity_feed(activity_subtype);

-- Drop existing trigger and function to recreate with new logic
DROP TRIGGER IF EXISTS create_activity_feed_entry_trigger ON workouts;
DROP TRIGGER IF EXISTS create_activity_feed_entry_on_measurement ON measurements;
DROP TRIGGER IF EXISTS create_activity_feed_entry_on_body_composition ON body_composition;
DROP TRIGGER IF EXISTS create_activity_feed_entry_on_goal ON goals;
DROP TRIGGER IF EXISTS create_activity_feed_entry_on_metric_value ON metric_values;

-- Recreate function with improved aggregation logic
CREATE OR REPLACE FUNCTION public.create_activity_feed_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      
      -- Check for existing sleep entry for this date
      SELECT id INTO existing_entry_id
      FROM public.activity_feed
      WHERE user_id = NEW.user_id
        AND activity_subtype = 'sleep_recovery'
        AND DATE(created_at) = NEW.measurement_date;
      
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
        activity_subtype, aggregated_data, metadata
      ) VALUES (
        NEW.user_id, 'sleep', v_action_text, 'metric_values', NEW.id,
        'sleep_recovery',
        jsonb_build_object('sleep_hours', total_sleep, 'recovery_percentage', recovery_value),
        to_jsonb(NEW)
      );
      RETURN NEW;
      
    -- Handle Recovery - merge with existing sleep entry
    ELSIF metric_info.metric_category = 'recovery' THEN
      SELECT id, aggregated_data INTO existing_entry_id, sleep_hours
      FROM public.activity_feed
      WHERE user_id = NEW.user_id
        AND activity_subtype = 'sleep_recovery'
        AND DATE(created_at) = NEW.measurement_date
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
          activity_subtype, aggregated_data
        ) VALUES (
          NEW.user_id, 'recovery', v_action_text, 'metric_values', NEW.id,
          'sleep_recovery',
          jsonb_build_object('recovery_percentage', NEW.value)
        );
        RETURN NEW;
      END IF;
      
    -- Handle Steps - one entry per day, update throughout the day
    ELSIF metric_info.metric_name = 'Steps' THEN
      SELECT id INTO existing_entry_id
      FROM public.activity_feed
      WHERE user_id = NEW.user_id
        AND activity_subtype = 'daily_steps'
        AND DATE(created_at) = NEW.measurement_date;
      
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
        activity_subtype, aggregated_data
      ) VALUES (
        NEW.user_id, 'steps', v_action_text, 'metric_values', NEW.id,
        'daily_steps',
        jsonb_build_object('steps', NEW.value)
      );
      RETURN NEW;
      
    -- Handle Workouts from metric_values
    ELSIF metric_info.metric_category = 'workout' AND metric_info.source = 'whoop' THEN
      IF metric_info.metric_name = 'Workout Strain' THEN
        SELECT id INTO existing_entry_id
        FROM public.activity_feed
        WHERE user_id = NEW.user_id
          AND activity_subtype = 'workout'
          AND DATE(created_at) = NEW.measurement_date
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
          activity_subtype, aggregated_data
        ) VALUES (
          NEW.user_id, 'workout', v_action_text, 'metric_values', NEW.id,
          'workout',
          jsonb_build_object('strain', NEW.value, 'calories', calories_value, 'external_id', NEW.external_id)
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
      user_id, action_type, action_text, source_table, source_id, metadata
    ) VALUES (
      NEW.user_id, TG_TABLE_NAME, v_action_text, TG_TABLE_NAME, NEW.id, to_jsonb(NEW)
    )
    ON CONFLICT (source_id, source_table) DO UPDATE
    SET action_text = EXCLUDED.action_text,
        metadata = EXCLUDED.metadata,
        updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER create_activity_feed_entry_trigger
  AFTER INSERT ON workouts
  FOR EACH ROW EXECUTE FUNCTION create_activity_feed_entry();

CREATE TRIGGER create_activity_feed_entry_on_measurement
  AFTER INSERT ON measurements
  FOR EACH ROW EXECUTE FUNCTION create_activity_feed_entry();

CREATE TRIGGER create_activity_feed_entry_on_body_composition
  AFTER INSERT ON body_composition
  FOR EACH ROW EXECUTE FUNCTION create_activity_feed_entry();

CREATE TRIGGER create_activity_feed_entry_on_goal
  AFTER INSERT ON goals
  FOR EACH ROW EXECUTE FUNCTION create_activity_feed_entry();

CREATE TRIGGER create_activity_feed_entry_on_metric_value
  AFTER INSERT ON metric_values
  FOR EACH ROW EXECUTE FUNCTION create_activity_feed_entry();

-- Add triggers for habits
CREATE OR REPLACE FUNCTION create_habit_feed_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile RECORD;
  habit_info RECORD;
  v_action_text TEXT;
  streak_days INTEGER;
BEGIN
  SELECT username INTO user_profile FROM public.profiles WHERE user_id = NEW.user_id;
  SELECT name, icon, habit_type FROM public.habits WHERE id = NEW.habit_id INTO habit_info;
  
  IF TG_TABLE_NAME = 'habit_completions' THEN
    v_action_text := COALESCE(user_profile.username, 'user') || ' completed: ' || 
                     COALESCE(habit_info.icon || ' ', '') || habit_info.name;
    
    INSERT INTO public.activity_feed (
      user_id, action_type, action_text, source_table, source_id,
      activity_subtype, metadata
    ) VALUES (
      NEW.user_id, 'habit', v_action_text, 'habit_completions', NEW.id,
      'habit_completion', to_jsonb(NEW)
    );
    
  ELSIF TG_TABLE_NAME = 'habit_measurements' THEN
    v_action_text := COALESCE(user_profile.username, 'user') || ' updated: ' ||
                     COALESCE(habit_info.icon || ' ', '') || habit_info.name ||
                     ' (+' || NEW.value || ')';
    
    INSERT INTO public.activity_feed (
      user_id, action_type, action_text, source_table, source_id,
      activity_subtype, aggregated_data
    ) VALUES (
      NEW.user_id, 'habit', v_action_text, 'habit_measurements', NEW.id,
      'habit_measurement',
      jsonb_build_object('value', NEW.value, 'habit_type', habit_info.habit_type)
    );
    
  ELSIF TG_TABLE_NAME = 'habit_attempts' AND NEW.end_date IS NULL THEN
    -- New attempt started
    v_action_text := COALESCE(user_profile.username, 'user') || ' started: ' ||
                     COALESCE(habit_info.icon || ' ', '') || habit_info.name;
    
    INSERT INTO public.activity_feed (
      user_id, action_type, action_text, source_table, source_id,
      activity_subtype, is_milestone, milestone_type
    ) VALUES (
      NEW.user_id, 'habit', v_action_text, 'habit_attempts', NEW.id,
      'habit_start', true, 'habit_start'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_habit_feed_on_completion
  AFTER INSERT ON habit_completions
  FOR EACH ROW EXECUTE FUNCTION create_habit_feed_entry();

CREATE TRIGGER create_habit_feed_on_measurement
  AFTER INSERT ON habit_measurements
  FOR EACH ROW EXECUTE FUNCTION create_habit_feed_entry();

CREATE TRIGGER create_habit_feed_on_attempt
  AFTER INSERT ON habit_attempts
  FOR EACH ROW EXECUTE FUNCTION create_habit_feed_entry();