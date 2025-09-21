-- Clean up duplicate goals step by step
-- First, delete the obvious duplicates keeping the most recent one
WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY user_id, goal_name, goal_type 
           ORDER BY created_at DESC
         ) as rn
  FROM goals 
  WHERE is_personal = true
)
DELETE FROM goals 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);