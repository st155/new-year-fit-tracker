-- Delete all Sleep Duration records with value less than 2 hours
-- This removes invalid short sleep records (naps, incomplete data) from unified_metrics
DELETE FROM unified_metrics
WHERE metric_name = 'Sleep Duration'
  AND value < 2.0;