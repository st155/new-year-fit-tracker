-- Удаляем дубликаты из measurements (оставляем самые свежие)
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, goal_id, measurement_date 
      ORDER BY created_at DESC
    ) as row_num
  FROM measurements
)
DELETE FROM measurements
WHERE id IN (
  SELECT id FROM duplicates WHERE row_num > 1
);

-- Добавляем UNIQUE constraint для предотвращения дубликатов
CREATE UNIQUE INDEX IF NOT EXISTS idx_measurements_unique_per_day 
ON measurements (user_id, goal_id, measurement_date);