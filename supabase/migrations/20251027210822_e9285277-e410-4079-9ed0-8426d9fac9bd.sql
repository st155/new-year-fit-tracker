-- Phase 2: Migrate existing data to unified_metrics

INSERT INTO unified_metrics (
  user_id, 
  metric_name, 
  metric_category, 
  value, 
  unit,
  measurement_date, 
  source, 
  external_id, 
  priority, 
  confidence_score, 
  confidence_factors, 
  is_outlier,
  source_data, 
  notes, 
  photo_url, 
  created_at
)
SELECT 
  mv.user_id,
  um.metric_name,
  um.metric_category,
  mv.value,
  um.unit,
  mv.measurement_date,
  um.source,
  mv.external_id,
  CASE LOWER(um.source)
    WHEN 'inbody' THEN 1
    WHEN 'withings' THEN 2
    WHEN 'whoop' THEN 3
    WHEN 'apple_health' THEN 4
    WHEN 'terra' THEN 5
    WHEN 'manual' THEN 6
    ELSE 10
  END as priority,
  COALESCE(mv.confidence_score, 50),
  mv.confidence_factors,
  mv.is_outlier,
  mv.source_data,
  mv.notes,
  mv.photo_url,
  mv.created_at
FROM metric_values mv
JOIN user_metrics um ON um.id = mv.metric_id
ON CONFLICT (user_id, metric_name, measurement_date, source) DO NOTHING;

-- Enable realtime for unified_metrics
ALTER TABLE unified_metrics REPLICA IDENTITY FULL;