-- Switch Sleep Efficiency widgets to multi-mode for better data availability
UPDATE dashboard_widgets
SET display_mode = 'multi'
WHERE metric_name = 'Sleep Efficiency'
AND display_mode = 'single';

-- Create function to auto-calculate Sleep Efficiency from Sleep Duration
CREATE OR REPLACE FUNCTION auto_calculate_sleep_efficiency()
RETURNS TRIGGER AS $$
DECLARE
  efficiency_value NUMERIC;
  deep_duration NUMERIC;
  rem_duration NUMERIC;
  light_duration NUMERIC;
  awake_duration NUMERIC;
  total_sleep NUMERIC;
  time_in_bed NUMERIC;
BEGIN
  -- Only process Sleep Duration metrics
  IF NEW.metric_name != 'Sleep Duration' THEN
    RETURN NEW;
  END IF;

  -- Extract sleep data from source_data (not metadata)
  deep_duration := COALESCE((NEW.source_data->>'deep_sleep_duration')::NUMERIC, 0);
  rem_duration := COALESCE((NEW.source_data->>'rem_sleep_duration')::NUMERIC, 0);
  light_duration := COALESCE((NEW.source_data->>'light_sleep_duration')::NUMERIC, 0);
  awake_duration := COALESCE((NEW.source_data->>'awake_duration')::NUMERIC, 0);

  total_sleep := deep_duration + rem_duration + light_duration;
  time_in_bed := total_sleep + awake_duration;

  -- Calculate efficiency if we have valid data
  IF time_in_bed > 0 THEN
    efficiency_value := ROUND((total_sleep / time_in_bed * 100)::NUMERIC, 1);

    -- Check if Sleep Efficiency already exists for this date and source
    IF NOT EXISTS (
      SELECT 1 FROM unified_metrics
      WHERE user_id = NEW.user_id
      AND metric_name = 'Sleep Efficiency'
      AND source = NEW.source
      AND measurement_date = NEW.measurement_date
    ) THEN
      -- Insert calculated Sleep Efficiency
      INSERT INTO unified_metrics (
        user_id,
        metric_name,
        value,
        unit,
        source,
        measurement_date,
        priority,
        metric_category,
        source_data
      ) VALUES (
        NEW.user_id,
        'Sleep Efficiency',
        efficiency_value,
        '%',
        NEW.source,
        NEW.measurement_date,
        COALESCE(NEW.priority, 0) + 1,
        'sleep',
        jsonb_build_object(
          'calculated_from', 'sleep_duration',
          'original_metric_id', NEW.id,
          'deep_sleep_duration', deep_duration,
          'rem_sleep_duration', rem_duration,
          'light_sleep_duration', light_duration,
          'awake_duration', awake_duration
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on unified_metrics INSERT
DROP TRIGGER IF EXISTS trigger_auto_calculate_sleep_efficiency ON unified_metrics;
CREATE TRIGGER trigger_auto_calculate_sleep_efficiency
  AFTER INSERT ON unified_metrics
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_sleep_efficiency();

-- Backfill Sleep Efficiency for the last 30 days
DO $$
DECLARE
  sleep_record RECORD;
  efficiency_value NUMERIC;
  deep_duration NUMERIC;
  rem_duration NUMERIC;
  light_duration NUMERIC;
  awake_duration NUMERIC;
  total_sleep NUMERIC;
  time_in_bed NUMERIC;
  processed_count INTEGER := 0;
BEGIN
  -- Get all Sleep Duration records from last 30 days without corresponding Sleep Efficiency
  FOR sleep_record IN
    SELECT DISTINCT ON (um.user_id, um.source, um.measurement_date) 
      um.id, um.user_id, um.source, um.measurement_date, um.priority, um.source_data
    FROM unified_metrics um
    WHERE um.metric_name = 'Sleep Duration'
    AND um.measurement_date >= CURRENT_DATE - INTERVAL '30 days'
    AND NOT EXISTS (
      SELECT 1 FROM unified_metrics se
      WHERE se.user_id = um.user_id
      AND se.metric_name = 'Sleep Efficiency'
      AND se.source = um.source
      AND se.measurement_date = um.measurement_date
    )
    ORDER BY um.user_id, um.source, um.measurement_date, um.created_at DESC
  LOOP
    -- Extract sleep data from source_data
    deep_duration := COALESCE((sleep_record.source_data->>'deep_sleep_duration')::NUMERIC, 0);
    rem_duration := COALESCE((sleep_record.source_data->>'rem_sleep_duration')::NUMERIC, 0);
    light_duration := COALESCE((sleep_record.source_data->>'light_sleep_duration')::NUMERIC, 0);
    awake_duration := COALESCE((sleep_record.source_data->>'awake_duration')::NUMERIC, 0);

    total_sleep := deep_duration + rem_duration + light_duration;
    time_in_bed := total_sleep + awake_duration;

    -- Calculate and insert efficiency
    IF time_in_bed > 0 THEN
      efficiency_value := ROUND((total_sleep / time_in_bed * 100)::NUMERIC, 1);

      INSERT INTO unified_metrics (
        user_id,
        metric_name,
        value,
        unit,
        source,
        measurement_date,
        priority,
        metric_category,
        source_data
      ) VALUES (
        sleep_record.user_id,
        'Sleep Efficiency',
        efficiency_value,
        '%',
        sleep_record.source,
        sleep_record.measurement_date,
        COALESCE(sleep_record.priority, 0) + 1,
        'sleep',
        jsonb_build_object(
          'calculated_from', 'sleep_duration',
          'original_metric_id', sleep_record.id,
          'backfilled', true
        )
      );

      processed_count := processed_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfilled % Sleep Efficiency records', processed_count;
END $$;