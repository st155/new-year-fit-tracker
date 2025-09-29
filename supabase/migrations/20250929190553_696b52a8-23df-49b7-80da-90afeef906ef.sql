-- Backfill activity feed from existing metric_values
-- This will create activity feed entries for existing workout, recovery, sleep, and cardio metrics

DO $$
DECLARE
  metric_record RECORD;
  user_profile RECORD;
  action_text TEXT;
  metric_info RECORD;
BEGIN
  -- Loop through metric_values that should have activity feed entries
  FOR metric_record IN 
    SELECT mv.id, mv.user_id, mv.metric_id, mv.value, mv.measurement_date, mv.created_at,
           m.metric_name, m.metric_category, m.unit, m.source
    FROM metric_values mv
    JOIN user_metrics m ON mv.metric_id = m.id
    WHERE m.metric_category IN ('workout', 'recovery', 'sleep', 'cardio')
      AND NOT EXISTS (
        SELECT 1 FROM activity_feed af 
        WHERE af.source_table = 'metric_values' 
        AND af.source_id = mv.id
      )
    ORDER BY mv.created_at DESC
    LIMIT 500  -- Limit to prevent timeout
  LOOP
    -- Get user profile
    SELECT username, full_name INTO user_profile
    FROM profiles
    WHERE user_id = metric_record.user_id;
    
    -- Build action text
    action_text := COALESCE(user_profile.full_name, user_profile.username);
    
    -- Format based on metric category
    IF metric_record.metric_category = 'workout' THEN
      action_text := action_text || ' завершил тренировку';
      IF metric_record.metric_name = 'Workout Strain' THEN
        action_text := action_text || ' (Strain: ' || ROUND(metric_record.value::numeric, 1) || ')';
      ELSIF metric_record.metric_name = 'Workout Calories' THEN
        action_text := action_text || ' (сжег ' || ROUND(metric_record.value::numeric, 0) || ' ккал)';
      END IF;
    ELSIF metric_record.metric_category = 'recovery' THEN
      action_text := action_text || ' обновил восстановление (Recovery: ' || ROUND(metric_record.value::numeric, 0) || '%)';
    ELSIF metric_record.metric_category = 'sleep' THEN
      action_text := action_text || ' записал сон (Sleep Performance: ' || ROUND(metric_record.value::numeric, 0) || '%)';
    ELSIF metric_record.metric_category = 'cardio' THEN
      IF metric_record.metric_name = 'VO2Max' THEN
        action_text := action_text || ' обновил VO2Max (' || ROUND(metric_record.value::numeric, 1) || ' ' || metric_record.unit || ')';
      END IF;
    END IF;
    
    -- Add source information
    IF metric_record.source = 'whoop' THEN
      action_text := action_text || ' [Whoop]';
    ELSIF metric_record.source = 'apple_health' THEN
      action_text := action_text || ' [Apple Health]';
    ELSIF metric_record.source = 'withings' THEN
      action_text := action_text || ' [Withings]';
    END IF;
    
    -- Insert into activity feed with the original created_at timestamp
    INSERT INTO activity_feed (
      user_id,
      action_type,
      action_text,
      source_table,
      source_id,
      metadata,
      created_at
    ) VALUES (
      metric_record.user_id,
      'metric_values',
      action_text,
      'metric_values',
      metric_record.id,
      jsonb_build_object(
        'metric_name', metric_record.metric_name,
        'metric_category', metric_record.metric_category,
        'value', metric_record.value,
        'unit', metric_record.unit,
        'source', metric_record.source
      ),
      metric_record.created_at
    );
  END LOOP;
END $$;