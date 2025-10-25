-- Phase 1: Add confidence tracking to metric_values
ALTER TABLE metric_values
ADD COLUMN IF NOT EXISTS confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
ADD COLUMN IF NOT EXISTS confidence_factors JSONB,
ADD COLUMN IF NOT EXISTS is_outlier BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS conflict_resolution_method TEXT;

-- Add source priorities to metric_mappings
ALTER TABLE metric_mappings
ADD COLUMN IF NOT EXISTS source_priorities JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS conflict_resolution_strategy TEXT DEFAULT 'highest_confidence';

-- Create unique index to prevent duplicates (simplified - just date part)
CREATE UNIQUE INDEX IF NOT EXISTS idx_metric_values_unique_day
ON metric_values (user_id, metric_id, DATE(measurement_date))
WHERE external_id IS NULL;

-- Cleanup existing duplicates in user_metrics
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, metric_name, source 
      ORDER BY created_at DESC
    ) as rn
  FROM user_metrics
)
DELETE FROM user_metrics
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Update metric_mappings with default priorities
UPDATE metric_mappings
SET source_priorities = jsonb_build_object(
  'inbody', 10,
  'withings', 8,
  'whoop', 9,
  'garmin', 8,
  'ultrahuman', 7,
  'apple_health', 6,
  'manual', 10,
  'terra', 5
)
WHERE source_priorities = '{}'::jsonb;