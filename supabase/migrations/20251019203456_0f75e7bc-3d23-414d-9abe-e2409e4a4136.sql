-- Add Oura mappings to metric_mappings
UPDATE metric_mappings
SET device_mappings = device_mappings || '{"oura": ["Steps"]}'::jsonb
WHERE unified_metric_name = 'Steps'
  AND NOT (device_mappings ? 'oura');

UPDATE metric_mappings
SET device_mappings = device_mappings || '{"oura": ["Active Calories"]}'::jsonb
WHERE unified_metric_name = 'Active Calories'
  AND NOT (device_mappings ? 'oura');

UPDATE metric_mappings
SET device_mappings = device_mappings || '{"oura": ["Sleep Duration"]}'::jsonb
WHERE unified_metric_name = 'Sleep Duration'
  AND NOT (device_mappings ? 'oura');

UPDATE metric_mappings
SET device_mappings = device_mappings || '{"oura": ["Average Heart Rate"]}'::jsonb
WHERE unified_metric_name = 'Heart Rate'
  AND NOT (device_mappings ? 'oura');

UPDATE metric_mappings
SET device_mappings = device_mappings || '{"oura": ["HRV RMSSD"]}'::jsonb
WHERE unified_metric_name = 'Heart Rate Variability'
  AND NOT (device_mappings ? 'oura');

UPDATE metric_mappings
SET device_mappings = device_mappings || '{"oura": ["Respiratory Rate"]}'::jsonb
WHERE unified_metric_name = 'Respiratory Rate'
  AND NOT (device_mappings ? 'oura');