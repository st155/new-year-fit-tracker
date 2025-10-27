-- Phase 1: Clean any duplicate widgets (by user_id + metric_name)
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY user_id, metric_name 
    ORDER BY created_at ASC
  ) as rn
  FROM dashboard_widgets
  WHERE is_visible = true
)
DELETE FROM dashboard_widgets 
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Phase 2: Drop the source column (no longer needed)
ALTER TABLE dashboard_widgets DROP COLUMN IF EXISTS source;

-- Phase 3: Add unique constraint on user_id + metric_name
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_widgets_user_metric 
ON dashboard_widgets(user_id, metric_name) 
WHERE is_visible = true;

-- Phase 4: Add comment for clarity
COMMENT ON TABLE dashboard_widgets IS 'Dashboard widgets - each user can have one widget per metric_name. Source is selected dynamically by useSmartWidgetsData.';
