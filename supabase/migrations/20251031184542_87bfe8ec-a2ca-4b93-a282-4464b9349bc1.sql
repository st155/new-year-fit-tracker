-- Add HRV RMSSD widget for all users who don't have it yet
INSERT INTO dashboard_widgets (user_id, metric_name, position, is_visible, display_mode)
SELECT 
  p.user_id,
  'HRV RMSSD' as metric_name,
  COALESCE((SELECT MAX(position) + 1 FROM dashboard_widgets WHERE user_id = p.user_id), 0) as position,
  true as is_visible,
  'multi' as display_mode
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM dashboard_widgets 
  WHERE user_id = p.user_id 
  AND metric_name = 'HRV RMSSD'
);