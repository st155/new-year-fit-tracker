-- Очищаем дублированные токены Whoop, оставляя только самые новые записи для каждого пользователя
WITH ranked_tokens AS (
  SELECT 
    id,
    user_id,
    updated_at,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC) as rn
  FROM whoop_tokens
),
tokens_to_delete AS (
  SELECT id 
  FROM ranked_tokens 
  WHERE rn > 1
)
DELETE FROM whoop_tokens 
WHERE id IN (SELECT id FROM tokens_to_delete);