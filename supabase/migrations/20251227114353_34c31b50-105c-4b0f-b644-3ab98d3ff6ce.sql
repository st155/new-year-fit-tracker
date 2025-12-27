-- Recalculate XP and levels for all users based on workouts
-- Step 1: Clear existing xp_history to recalculate fresh
DELETE FROM xp_history WHERE reason IN ('Workout completion', 'workout_completion', 'Workout XP recalculation');

-- Step 2: Insert XP entries for each workout with progressive bonuses
-- Base: 15 XP per workout, +3 bonus every 10 workouts (up to +30 max)
WITH workout_xp AS (
  SELECT 
    user_id,
    id as workout_id,
    start_time,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY start_time) as workout_num
  FROM workouts
  WHERE user_id IS NOT NULL
)
INSERT INTO xp_history (user_id, xp_earned, reason, earned_at)
SELECT 
  user_id,
  15 + LEAST(30, FLOOR((workout_num - 1) / 10) * 3)::INTEGER as xp_earned,
  'Workout XP recalculation',
  start_time
FROM workout_xp;

-- Step 3: Update profiles with total XP and calculated levels
-- Level formula: floor(sqrt(totalXP / 100)) + 1
UPDATE profiles p
SET 
  total_xp = COALESCE(xp.total, 0),
  current_level = GREATEST(1, FLOOR(SQRT(COALESCE(xp.total, 0) / 100.0)) + 1)
FROM (
  SELECT user_id, SUM(xp_earned)::INTEGER as total
  FROM xp_history
  GROUP BY user_id
) xp
WHERE p.user_id = xp.user_id;

-- Step 4: Assign Trainer badge to Anton (without metadata column)
INSERT INTO user_achievements (user_id, achievement_id, unlocked_at, progress)
VALUES (
  'f9e07829-5fd7-4e27-94eb-b3f5c49b4e7e',
  'trainer',
  now(),
  100
)
ON CONFLICT (user_id, achievement_id) DO NOTHING;

-- Step 5: Auto-assign completion achievements based on workout count
WITH user_workout_counts AS (
  SELECT user_id, COUNT(*) as workout_count
  FROM workouts
  WHERE user_id IS NOT NULL
  GROUP BY user_id
),
achievements_to_grant AS (
  SELECT 
    uwc.user_id,
    'first_habit' as achievement_id,
    100 as progress
  FROM user_workout_counts uwc
  WHERE uwc.workout_count >= 1
  
  UNION ALL
  
  SELECT user_id, 'completions_10', 100
  FROM user_workout_counts WHERE workout_count >= 10
  
  UNION ALL
  
  SELECT user_id, 'completions_50', 100
  FROM user_workout_counts WHERE workout_count >= 50
  
  UNION ALL
  
  SELECT user_id, 'completions_100', 100
  FROM user_workout_counts WHERE workout_count >= 100
  
  UNION ALL
  
  SELECT user_id, 'completions_500', 100
  FROM user_workout_counts WHERE workout_count >= 500
)
INSERT INTO user_achievements (user_id, achievement_id, unlocked_at, progress)
SELECT user_id, achievement_id, now(), progress
FROM achievements_to_grant
ON CONFLICT (user_id, achievement_id) DO NOTHING;

-- Step 6: Add XP for achievements to xp_history
INSERT INTO xp_history (user_id, xp_earned, reason, earned_at)
SELECT 
  ua.user_id,
  CASE ua.achievement_id
    WHEN 'first_habit' THEN 10
    WHEN 'completions_10' THEN 30
    WHEN 'completions_50' THEN 80
    WHEN 'completions_100' THEN 150
    WHEN 'completions_500' THEN 400
    WHEN 'trainer' THEN 500
    ELSE 0
  END,
  'Achievement unlock: ' || ua.achievement_id,
  ua.unlocked_at
FROM user_achievements ua
WHERE NOT EXISTS (
  SELECT 1 FROM xp_history xh 
  WHERE xh.user_id = ua.user_id 
  AND xh.reason = 'Achievement unlock: ' || ua.achievement_id
);

-- Step 7: Final update of profiles with achievement XP included
UPDATE profiles p
SET 
  total_xp = COALESCE(xp.total, 0),
  current_level = GREATEST(1, FLOOR(SQRT(COALESCE(xp.total, 0) / 100.0)) + 1)
FROM (
  SELECT user_id, SUM(xp_earned)::INTEGER as total
  FROM xp_history
  GROUP BY user_id
) xp
WHERE p.user_id = xp.user_id;