-- Remove duplicates if any exist
DELETE FROM metric_values a USING metric_values b
WHERE a.id > b.id 
  AND a.user_id = b.user_id 
  AND a.metric_id = b.metric_id 
  AND a.measurement_date = b.measurement_date
  AND COALESCE(a.external_id, '') = COALESCE(b.external_id, '');

-- Create unique constraint for external_id to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS metric_values_unique_external 
ON metric_values (user_id, metric_id, measurement_date, external_id)
WHERE external_id IS NOT NULL;