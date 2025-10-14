-- Fix Steps aggregation method from sum to max
-- This prevents duplicate counting when multiple devices sync the same data
UPDATE metric_mappings
SET aggregation_method = 'max'
WHERE unified_metric_name = 'Steps';