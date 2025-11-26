-- Recalculate Sleep Duration by summing only sleep stages (excluding awake time)
-- This fixes the issue where awakeDuration was incorrectly included in Sleep Duration

UPDATE unified_metrics 
SET value = (
  SELECT COALESCE(
    ROUND(
      (COALESCE(SUM(CASE WHEN metric_name = 'Deep Sleep Duration' THEN value ELSE 0 END), 0) +
       COALESCE(SUM(CASE WHEN metric_name = 'Light Sleep Duration' THEN value ELSE 0 END), 0) +
       COALESCE(SUM(CASE WHEN metric_name = 'REM Sleep Duration' THEN value ELSE 0 END), 0))::numeric, 
      2
    ), 
    0
  )
  FROM unified_metrics sub
  WHERE sub.user_id = unified_metrics.user_id
    AND sub.measurement_date = unified_metrics.measurement_date
    AND sub.source = unified_metrics.source
    AND sub.metric_name IN ('Deep Sleep Duration', 'Light Sleep Duration', 'REM Sleep Duration')
)
WHERE metric_name = 'Sleep Duration'
  AND value > 0
  AND EXISTS (
    SELECT 1 FROM unified_metrics sub
    WHERE sub.user_id = unified_metrics.user_id
      AND sub.measurement_date = unified_metrics.measurement_date
      AND sub.source = unified_metrics.source
      AND sub.metric_name IN ('Deep Sleep Duration', 'Light Sleep Duration', 'REM Sleep Duration')
  );

-- Delete Sleep Duration records that are less than 30 minutes (likely naps or incomplete data)
DELETE FROM unified_metrics
WHERE metric_name = 'Sleep Duration'
  AND value < 0.5;  -- 0.5 hours = 30 minutes