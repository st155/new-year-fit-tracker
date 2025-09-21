-- Remove all duplicates completely by deleting older records
WITH ranked_goals AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY user_id, goal_name, goal_type 
           ORDER BY created_at DESC, id DESC
         ) as rn
  FROM goals 
  WHERE is_personal = true
)
DELETE FROM goals 
WHERE id IN (
  SELECT id FROM ranked_goals WHERE rn > 1
);