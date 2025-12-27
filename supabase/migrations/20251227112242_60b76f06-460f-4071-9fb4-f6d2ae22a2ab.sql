-- Insert XP history for all of Anton's workouts
-- Anton's user_id: 4c219866-4621-4c5f-bd1d-90e4e0d7ed80

INSERT INTO xp_history (user_id, xp_earned, reason, earned_at, created_at)
SELECT 
  w.user_id,
  CASE 
    WHEN row_number() OVER (ORDER BY w.start_time) <= 7 THEN 15
    WHEN row_number() OVER (ORDER BY w.start_time) <= 14 THEN 18
    WHEN row_number() OVER (ORDER BY w.start_time) <= 21 THEN 20
    WHEN row_number() OVER (ORDER BY w.start_time) <= 30 THEN 23
    ELSE 25
  END as xp_earned,
  'workout_completion' as reason,
  w.start_time as earned_at,
  w.start_time as created_at
FROM workouts w
WHERE w.user_id = '4c219866-4621-4c5f-bd1d-90e4e0d7ed80'
ORDER BY w.start_time;

-- Update trainer_role for Anton
UPDATE profiles 
SET trainer_role = true 
WHERE user_id = '4c219866-4621-4c5f-bd1d-90e4e0d7ed80';