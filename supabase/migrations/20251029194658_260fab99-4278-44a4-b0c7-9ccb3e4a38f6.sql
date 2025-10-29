-- Fix security warning: set search_path for the trigger function
CREATE OR REPLACE FUNCTION sync_metric_values_to_unified()
RETURNS TRIGGER AS $$
DECLARE
  v_metric_name TEXT;
  v_metric_category TEXT;
  v_unit TEXT;
  v_source TEXT;
  v_priority INTEGER;
BEGIN
  -- Get metric metadata from user_metrics
  SELECT metric_name, metric_category, unit, source
  INTO v_metric_name, v_metric_category, v_unit, v_source
  FROM user_metrics
  WHERE id = NEW.metric_id;

  -- If metric not found, skip
  IF v_metric_name IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate priority based on source
  v_priority := CASE LOWER(v_source)
    WHEN 'whoop' THEN 1
    WHEN 'garmin' THEN 2
    WHEN 'ultrahuman' THEN 2
    WHEN 'oura' THEN 3
    WHEN 'withings' THEN 4
    ELSE 5
  END;

  -- For incremental metrics (Steps), use GREATEST to keep max value
  IF v_metric_name = 'Steps' THEN
    INSERT INTO unified_metrics (
      user_id, metric_name, metric_category, source, provider,
      value, unit, measurement_date, priority, confidence_score
    ) VALUES (
      NEW.user_id, v_metric_name, v_metric_category, 
      LOWER(v_source), LOWER(v_source),
      NEW.value, v_unit, NEW.measurement_date, v_priority, 50
    )
    ON CONFLICT (user_id, metric_name, measurement_date, source)
    DO UPDATE SET
      value = GREATEST(unified_metrics.value, EXCLUDED.value),
      updated_at = NOW();
  ELSE
    -- For other metrics, just replace with new value
    INSERT INTO unified_metrics (
      user_id, metric_name, metric_category, source, provider,
      value, unit, measurement_date, priority, confidence_score
    ) VALUES (
      NEW.user_id, v_metric_name, v_metric_category, 
      LOWER(v_source), LOWER(v_source),
      NEW.value, v_unit, NEW.measurement_date, v_priority, 50
    )
    ON CONFLICT (user_id, metric_name, measurement_date, source)
    DO UPDATE SET
      value = EXCLUDED.value,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;