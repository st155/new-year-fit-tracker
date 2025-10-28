-- Add display_mode column to dashboard_widgets table
ALTER TABLE dashboard_widgets 
ADD COLUMN display_mode TEXT DEFAULT 'single' 
CHECK (display_mode IN ('single', 'multi'));

-- Create index for faster queries on multi-source widgets
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_display_mode 
ON dashboard_widgets(user_id, display_mode) 
WHERE display_mode = 'multi';

-- Update existing widgets for key metrics to default to multi-source mode
UPDATE dashboard_widgets 
SET display_mode = 'multi' 
WHERE metric_name IN ('Steps', 'Recovery Score', 'Sleep Duration', 'Day Strain', 'Resting Heart Rate');