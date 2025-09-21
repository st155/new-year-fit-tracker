-- Clean up duplicate goals, keeping only the most recent one for each user/goal combination
WITH duplicates AS (
  SELECT id, goal_name, goal_type, target_value, target_unit, user_id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, goal_name, goal_type, target_value, target_unit 
           ORDER BY created_at DESC
         ) as rn
  FROM goals 
  WHERE is_personal = true
)
DELETE FROM goals 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_personal_goals 
ON goals (user_id, goal_name, goal_type) 
WHERE is_personal = true;