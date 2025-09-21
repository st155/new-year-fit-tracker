-- Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_personal_goals 
ON goals (user_id, goal_name, goal_type) 
WHERE is_personal = true;