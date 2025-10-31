-- Simplified trigger to auto-calculate Sleep Efficiency directly in SQL
-- This ensures Sleep Efficiency is calculated for all sources including Ultrahuman

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_unified_sleep_efficiency ON unified_metrics;

-- Create or replace the trigger function that calculates Sleep Efficiency
CREATE OR REPLACE FUNCTION calculate_unified_sleep_efficiency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Extract sleep data from source_data
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
        provider,
        measurement_date,
        priority,
        metric_category,
        source_data,
        confidence_score
      ) VALUES (
        NEW.user_id,
        'Sleep Efficiency',
        efficiency_value,
        '%',
        NEW.source,
        NEW.provider,
        NEW.measurement_date,
        COALESCE(NEW.priority, 0),
        'sleep',
        jsonb_build_object(
          'calculated_from', 'sleep_duration',
          'original_metric_id', NEW.id,
          'deep_sleep_duration', deep_duration,
          'rem_sleep_duration', rem_duration,
          'light_sleep_duration', light_duration,
          'awake_duration', awake_duration
        ),
        50
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger on unified_metrics table
CREATE TRIGGER trigger_unified_sleep_efficiency
AFTER INSERT ON unified_metrics
FOR EACH ROW
WHEN (NEW.metric_name = 'Sleep Duration')
EXECUTE FUNCTION calculate_unified_sleep_efficiency();

-- Backfill Sleep Efficiency for missing data from last 7 days
INSERT INTO unified_metrics (
  user_id,
  metric_name,
  value,
  unit,
  source,
  provider,
  measurement_date,
  priority,
  metric_category,
  source_data,
  confidence_score
)
SELECT 
  um.user_id,
  'Sleep Efficiency',
  ROUND((
    (COALESCE((um.source_data->>'deep_sleep_duration')::NUMERIC, 0) +
     COALESCE((um.source_data->>'rem_sleep_duration')::NUMERIC, 0) +
     COALESCE((um.source_data->>'light_sleep_duration')::NUMERIC, 0)) /
    NULLIF(
      (COALESCE((um.source_data->>'deep_sleep_duration')::NUMERIC, 0) +
       COALESCE((um.source_data->>'rem_sleep_duration')::NUMERIC, 0) +
       COALESCE((um.source_data->>'light_sleep_duration')::NUMERIC, 0) +
       COALESCE((um.source_data->>'awake_duration')::NUMERIC, 0)),
      0
    ) * 100
  )::NUMERIC, 1) as efficiency,
  '%',
  um.source,
  um.provider,
  um.measurement_date,
  um.priority,
  'sleep',
  jsonb_build_object(
    'calculated_from', 'sleep_duration',
    'original_metric_id', um.id,
    'deep_sleep_duration', COALESCE((um.source_data->>'deep_sleep_duration')::NUMERIC, 0),
    'rem_sleep_duration', COALESCE((um.source_data->>'rem_sleep_duration')::NUMERIC, 0),
    'light_sleep_duration', COALESCE((um.source_data->>'light_sleep_duration')::NUMERIC, 0),
    'awake_duration', COALESCE((um.source_data->>'awake_duration')::NUMERIC, 0)
  ),
  50
FROM unified_metrics um
WHERE um.metric_name = 'Sleep Duration'
  AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'
  AND (COALESCE((um.source_data->>'deep_sleep_duration')::NUMERIC, 0) +
       COALESCE((um.source_data->>'rem_sleep_duration')::NUMERIC, 0) +
       COALESCE((um.source_data->>'light_sleep_duration')::NUMERIC, 0) +
       COALESCE((um.source_data->>'awake_duration')::NUMERIC, 0)) > 0
  AND NOT EXISTS (
    SELECT 1 FROM unified_metrics se
    WHERE se.user_id = um.user_id
      AND se.metric_name = 'Sleep Efficiency'
      AND se.source = um.source
      AND se.measurement_date = um.measurement_date
  )
ON CONFLICT (user_id, metric_name, measurement_date, source) DO NOTHING;