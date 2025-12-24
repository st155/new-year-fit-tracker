
-- Fix workout date from Dec 24 to Dec 17, 2025
UPDATE workouts 
SET start_time = '2025-12-17 08:00:00+00'
WHERE id = 'c183d6e6-8d35-43fd-88b4-a824f4bc0046';

-- Fix workout_logs dates for the same workout entries
UPDATE workout_logs 
SET performed_at = '2025-12-17 08:00:00+00'
WHERE created_at >= '2025-12-24 17:07:31' 
  AND created_at < '2025-12-24 17:07:32';
