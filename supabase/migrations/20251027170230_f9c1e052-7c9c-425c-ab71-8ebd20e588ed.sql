-- Standardize metric names in dashboard_widgets
UPDATE dashboard_widgets 
SET metric_name = 'Resting Heart Rate'
WHERE metric_name = 'Resting HR';

UPDATE dashboard_widgets 
SET metric_name = 'Active Calories'
WHERE metric_name = 'Workout Calories';

UPDATE dashboard_widgets 
SET metric_name = 'Day Strain'
WHERE metric_name = 'Workout Strain';

-- Update Steps source to terra for all non-terra sources
UPDATE dashboard_widgets 
SET source = 'terra'
WHERE metric_name = 'Steps' AND source IN ('ultrahuman', 'garmin', 'whoop', 'apple_health');