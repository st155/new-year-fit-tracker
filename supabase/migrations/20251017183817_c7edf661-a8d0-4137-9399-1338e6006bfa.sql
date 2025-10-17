-- Create unified metrics view as single source of truth
CREATE OR REPLACE VIEW client_unified_metrics AS
WITH prioritized_metrics AS (
  SELECT 
    user_id,
    metric_name,
    value,
    measurement_date,
    source,
    unit,
    CASE source
      -- Priority: Whoop > Withings > Terra > Manual > Apple Health
      WHEN 'whoop' THEN 1
      WHEN 'withings' THEN 2
      WHEN 'terra' THEN 3
      WHEN 'manual' THEN 4
      WHEN 'apple_health' THEN 5
      ELSE 6
    END as priority,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, metric_name, measurement_date 
      ORDER BY 
        CASE source
          WHEN 'whoop' THEN 1
          WHEN 'withings' THEN 2
          WHEN 'terra' THEN 3
          WHEN 'manual' THEN 4
          WHEN 'apple_health' THEN 5
          ELSE 6
        END ASC
    ) as rn
  FROM (
    -- Get metrics from metric_values
    SELECT 
      mv.user_id,
      um.metric_name,
      mv.value,
      mv.measurement_date,
      um.source,
      um.unit
    FROM metric_values mv
    JOIN user_metrics um ON um.id = mv.metric_id
    
    UNION ALL
    
    -- Get weight from measurements
    SELECT 
      m.user_id,
      'Weight' as metric_name,
      m.value,
      m.measurement_date::date as measurement_date,
      'manual' as source,
      m.unit
    FROM measurements m
    JOIN goals g ON g.id = m.goal_id
    WHERE g.goal_type = 'body_composition' AND g.goal_name ILIKE '%вес%' OR g.goal_name ILIKE '%weight%'
    
    UNION ALL
    
    -- Get weight from body_composition
    SELECT 
      user_id,
      'Weight' as metric_name,
      weight as value,
      measurement_date,
      COALESCE(measurement_method, 'manual') as source,
      'kg' as unit
    FROM body_composition
    WHERE weight IS NOT NULL
    
    UNION ALL
    
    -- Get weight from daily_health_summary
    SELECT 
      user_id,
      'Weight' as metric_name,
      weight as value,
      date as measurement_date,
      'apple_health' as source,
      'kg' as unit
    FROM daily_health_summary
    WHERE weight IS NOT NULL
  ) all_metrics
)
SELECT 
  user_id,
  metric_name,
  value,
  measurement_date,
  source,
  unit,
  priority
FROM prioritized_metrics
WHERE rn = 1
ORDER BY user_id, metric_name, measurement_date DESC;

-- Grant access to authenticated users
GRANT SELECT ON client_unified_metrics TO authenticated;

-- Create RLS policy for the view
ALTER VIEW client_unified_metrics OWNER TO postgres;

COMMENT ON VIEW client_unified_metrics IS 'Unified view of all client metrics with source priority: Whoop > Withings > Terra > Manual > Apple Health. Automatically deduplicates metrics by selecting highest priority source for each user/metric/date combination.';