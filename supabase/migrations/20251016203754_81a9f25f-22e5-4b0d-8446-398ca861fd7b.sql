-- Fix existing sleep/recovery entries in activity_feed
-- Set activity_subtype and aggregated_data for records that have sleep/recovery in action_text

UPDATE activity_feed
SET 
  activity_subtype = 'sleep_recovery',
  aggregated_data = CASE
    WHEN action_text ILIKE '%slept%' AND action_text ILIKE '%recovery%' THEN
      jsonb_build_object(
        'sleep_hours', 
        CAST(COALESCE(
          SUBSTRING(action_text FROM 'slept ([0-9]+)h'),
          '0'
        ) AS NUMERIC) + 
        CAST(COALESCE(
          SUBSTRING(action_text FROM '([0-9]+)m'),
          '0'
        ) AS NUMERIC) / 60.0,
        'recovery_percentage',
        CAST(COALESCE(
          SUBSTRING(action_text FROM '([0-9]+)% recovery'),
          '0'
        ) AS NUMERIC)
      )
    WHEN action_text ILIKE '%slept%' THEN
      jsonb_build_object(
        'sleep_hours',
        CAST(COALESCE(
          SUBSTRING(action_text FROM 'slept ([0-9]+)h'),
          '0'
        ) AS NUMERIC) + 
        CAST(COALESCE(
          SUBSTRING(action_text FROM '([0-9]+)m'),
          '0'
        ) AS NUMERIC) / 60.0
      )
    WHEN action_text ILIKE '%recover%' THEN
      jsonb_build_object(
        'recovery_percentage',
        CAST(COALESCE(
          SUBSTRING(action_text FROM '([0-9]+)%'),
          '0'
        ) AS NUMERIC)
      )
    ELSE '{}'::jsonb
  END,
  measurement_date = COALESCE(
    measurement_date,
    (metadata->>'measurement_date')::date,
    DATE(created_at)
  )
WHERE 
  (action_text ILIKE '%slept%' OR action_text ILIKE '%recover%')
  AND (activity_subtype IS NULL OR activity_subtype != 'sleep_recovery');